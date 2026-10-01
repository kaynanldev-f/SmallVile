import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { Order, OrderDocument } from 'src/orders/schemas/order.schema';
import { OrderStatus } from 'src/orders/enums/order-status.enum';
import { Payment, PaymentDocument } from 'src/payments/schemas/payment.schema';
import { PaymentStatus } from 'src/payments/enums/payment-status.enum';
import {
  PAYMENT_METHOD_LABEL,
  PaymentMethod,
} from 'src/payments/enums/payment-method.enum';
import { Product, ProductDocument } from 'src/products/schema/products.schema';
import { Session, SessionDocument } from 'src/session/schemas/session.schema';
import { LOW_STOCK_THRESHOLD } from 'src/products/constants/stock.constants';
import {
  CINEMA_TIME_ZONE,
  CINEMA_UTC_OFFSET,
  getCinemaWeekday,
  WEEKDAY_LABEL,
} from 'src/sales-control/constants/weekday';
import { AnalyticsQueryDto } from '../dtos/analytics-query.dto';
import { AnalyticsPeriod } from '../enums/analytics-period.enum';
import { ANALYTICS_MESSAGES } from '../messages/analytics.message';

export interface ResolvedPeriod {
  period: AnalyticsPeriod;
  from: Date;
  to: Date;
}

/** Uma linha da comparação de vendas por data. */
export interface DailySalesPoint {
  /** "AAAA-MM-DD" no fuso do cinema. */
  date: string;
  revenue: number;
  orders: number;
  tickets: number;
  weekday: number | null;
  weekdayLabel: string | null;
}

/** Teto da série diária. */
const MAX_TIMESERIES_DAYS = 366;

/** Métricas do dashboard administrativo. */
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  /**
   * Traduz o atalho de período em um intervalo real, no fuso do cinema.
   * "Hoje" precisa começar à meia-noite de São Paulo, não à meia-noite UTC
   * — senão a madrugada aparece no dia errado do relatório.
   */
  resolvePeriod(query: AnalyticsQueryDto): ResolvedPeriod {
    const period = query.period ?? AnalyticsPeriod.LAST_30_DAYS;
    const now = new Date();

    if (period === AnalyticsPeriod.CUSTOM) {
      if (!query.from || !query.to) {
        throw new BadRequestException(
          ANALYTICS_MESSAGES.CUSTOM_PERIOD_REQUIRED,
        );
      }
      if (query.from > query.to) {
        throw new BadRequestException(ANALYTICS_MESSAGES.INVALID_PERIOD);
      }
      return { period, from: query.from, to: query.to };
    }

    const todayStart = this.startOfCinemaDay(now);

    switch (period) {
      case AnalyticsPeriod.TODAY:
        return { period, from: todayStart, to: now };

      case AnalyticsPeriod.LAST_7_DAYS:
        return {
          period,
          from: this.addDays(todayStart, -6),
          to: now,
        };

      case AnalyticsPeriod.THIS_MONTH:
        return { period, from: this.startOfCinemaMonth(now), to: now };

      case AnalyticsPeriod.LAST_30_DAYS:
      default:
        return { period, from: this.addDays(todayStart, -29), to: now };
    }
  }

  /**
   * Painel principal: indicadores, série temporal, dias da semana e formas
   * de pagamento em uma resposta só — é o que a tela abre de primeira.
   */
  async getSalesOverview(query: AnalyticsQueryDto) {
    const range = this.resolvePeriod(query);

    const [summary, timeseries, weekdays, paymentMethods] = await Promise.all([
      this.getSummary(range),
      this.getTimeseries(range),
      this.getWeekdayDistribution(range),
      this.getPaymentMethods(range),
    ]);

    return {
      period: this.describePeriod(range),
      summary,
      timeseries,
      weekdays,
      paymentMethods,
    };
  }

  async getSummary(range: ResolvedPeriod) {
    const [result] = await this.orderModel
      .aggregate<{
        revenue: number;
        orders: number;
        tickets: number;
        products: number;
      }>([
        ...this.paidOrdersStages(range),
        {
          $group: {
            _id: null,
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            tickets: { $sum: { $size: { $ifNull: ['$seats', []] } } },
            products: {
              $sum: { $sum: { $ifNull: ['$products.quantity', []] } },
            },
          },
        },
      ])
      .exec();

    const revenue = result?.revenue ?? 0;
    const orders = result?.orders ?? 0;

    return {
      revenue,
      orders,
      tickets: result?.tickets ?? 0,
      products: result?.products ?? 0,
      // Ticket médio por pedido, em centavos. Sem pedido no período o valor
      // é zero — e não uma divisão por zero.
      averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  }

  /**
   * Receita, pedidos e ingressos por dia — base do gráfico de linha e da
   * tabela de comparação por data.
   */
  async getTimeseries(range: ResolvedPeriod): Promise<DailySalesPoint[]> {
    const rows = await this.orderModel
      .aggregate<{
        date: string;
        revenue: number;
        orders: number;
        tickets: number;
      }>([
        ...this.paidOrdersStages(range),
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$paidAt',
                timezone: CINEMA_TIME_ZONE,
              },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            tickets: { $sum: { $size: { $ifNull: ['$seats', []] } } },
          },
        },
        { $sort: { _id: 1 } },
        {
          $project: {
            _id: 0,
            date: '$_id',
            revenue: 1,
            orders: 1,
            tickets: 1,
          },
        },
      ])
      .exec();

    const byDate = new Map(rows.map((row) => [row.date, row]));
    const days = this.listCinemaDays(range);

    // Intervalo longo demais para uma tabela dia a dia: devolve apenas os
    // dias com movimento, em vez de centenas de linhas zeradas.
    const dates = days ?? rows.map((row) => row.date);

    return dates.map((date) => {
      const row = byDate.get(date);
      const weekday = getCinemaWeekday(`${date}T12:00:00${CINEMA_UTC_OFFSET}`);

      return {
        date,
        revenue: row?.revenue ?? 0,
        orders: row?.orders ?? 0,
        tickets: row?.tickets ?? 0,
        weekday,
        weekdayLabel: weekday === null ? null : WEEKDAY_LABEL[weekday],
      };
    });
  }

  /** Todos os dias do período, no fuso do cinema. */
  private listCinemaDays(range: ResolvedPeriod): string[] | null {
    const first = this.formatCinemaDay(range.from);
    const last = this.formatCinemaDay(range.to);

    if (!first || !last || first > last) {
      return null;
    }

    const days: string[] = [];
    // Meio-dia UTC: longe das bordas do dia, o passo de 24h nunca escorrega
    // para a data anterior ou seguinte.
    const cursor = new Date(`${first}T12:00:00.000Z`);
    const end = new Date(`${last}T12:00:00.000Z`);

    while (cursor <= end) {
      days.push(cursor.toISOString().slice(0, 10));

      if (days.length > MAX_TIMESERIES_DAYS) {
        return null;
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return days;
  }

  /** Data de um instante, "AAAA-MM-DD", no fuso do cinema. */
  private formatCinemaDay(value: Date): string | null {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Intl.DateTimeFormat('en-CA', {
      timeZone: CINEMA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  /** Volume por dia da semana — responde "qual dia vende mais". */
  async getWeekdayDistribution(range: ResolvedPeriod) {
    const rows = await this.orderModel
      .aggregate<{
        _id: number;
        revenue: number;
        orders: number;
        tickets: number;
      }>([
        ...this.paidOrdersStages(range),
        {
          $group: {
            _id: {
              $dayOfWeek: { date: '$paidAt', timezone: CINEMA_TIME_ZONE },
            },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
            tickets: { $sum: { $size: { $ifNull: ['$seats', []] } } },
          },
        },
      ])
      .exec();

    // `$dayOfWeek` devolve 1 = domingo ... 7 = sábado.
    const byWeekday = new Map(rows.map((row) => [row._id - 1, row]));

    return Object.keys(WEEKDAY_LABEL).map((key) => {
      const weekday = Number(key);
      const row = byWeekday.get(weekday);

      return {
        weekday,
        label: WEEKDAY_LABEL[weekday],
        revenue: row?.revenue ?? 0,
        orders: row?.orders ?? 0,
        tickets: row?.tickets ?? 0,
      };
    });
  }

  /** Distribuição por forma de pagamento. */
  async getPaymentMethods(range: ResolvedPeriod) {
    const rows = await this.paymentModel
      .aggregate<{ _id: PaymentMethod; amount: number; count: number }>([
        {
          $addFields: {
            paidAt: { $ifNull: ['$processedAt', '$createdAt'] },
          },
        },
        {
          $match: {
            status: PaymentStatus.APPROVED,
            paidAt: { $gte: range.from, $lte: range.to },
          },
        },
        {
          $group: {
            _id: '$method',
            amount: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ])
      .exec();

    const total = rows.reduce((sum, row) => sum + row.amount, 0);

    return rows.map((row) => ({
      method: row._id,
      label: PAYMENT_METHOD_LABEL[row._id] ?? row._id,
      amount: row.amount,
      count: row.count,
      share: total > 0 ? Math.round((row.amount / total) * 1000) / 10 : 0,
    }));
  }

  /** Filmes mais vendidos, por ingressos. */
  async getTopMovies(query: AnalyticsQueryDto) {
    const range = this.resolvePeriod(query);
    const limit = query.limit ?? 10;

    const rows = await this.orderModel
      .aggregate<{
        _id: Types.ObjectId | null;
        title: string;
        tickets: number;
        revenue: number;
        sessions: Types.ObjectId[];
      }>([
        ...this.paidOrdersStages(range),
        ...this.joinSessionStages(),
        {
          $group: {
            _id: '$sessionDoc.movieId',
            title: { $first: '$sessionDoc.movieTitle' },
            tickets: { $sum: { $size: { $ifNull: ['$seats', []] } } },
            revenue: { $sum: { $sum: '$seats.pricePaid' } },
            sessions: { $addToSet: '$sessionDoc._id' },
          },
        },
        { $sort: { tickets: -1, revenue: -1 } },
        { $limit: limit },
      ])
      .exec();

    // Ocupação real: ingressos vendidos sobre a capacidade das sessões que
    // participaram do ranking.
    const capacities = await this.getSessionsCapacity(
      rows.flatMap((row) => row.sessions ?? []),
    );

    return {
      period: this.describePeriod(range),
      items: rows.map((row) => {
        const capacity = (row.sessions ?? []).reduce(
          (sum, id) => sum + (capacities.get(id.toString()) ?? 0),
          0,
        );

        return {
          movieId: row._id ? row._id.toString() : null,
          title: row.title,
          tickets: row.tickets,
          revenue: row.revenue,
          sessions: row.sessions?.length ?? 0,
          occupancyRate:
            capacity > 0
              ? Math.round((row.tickets / capacity) * 1000) / 10
              : null,
        };
      }),
    };
  }

  /** Ranking de cinemas. */
  async getTopCinemas(query: AnalyticsQueryDto) {
    const range = this.resolvePeriod(query);
    const limit = query.limit ?? 10;

    const rows = await this.orderModel
      .aggregate<{
        _id: Types.ObjectId | null;
        name: string;
        city: string;
        tickets: number;
        revenue: number;
        orders: number;
      }>([
        ...this.paidOrdersStages(range),
        ...this.joinSessionStages(),
        {
          $lookup: {
            from: 'cinemas',
            localField: 'sessionDoc.cinemaId',
            foreignField: '_id',
            as: 'cinemaDoc',
          },
        },
        { $unwind: { path: '$cinemaDoc', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$sessionDoc.cinemaId',
            name: { $first: '$cinemaDoc.name' },
            city: { $first: '$cinemaDoc.city' },
            tickets: { $sum: { $size: { $ifNull: ['$seats', []] } } },
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
      ])
      .exec();

    return {
      period: this.describePeriod(range),
      items: rows.map((row) => ({
        cinemaId: row._id ? row._id.toString() : null,
        name: row.name ?? 'Cinema removido',
        city: row.city ?? null,
        tickets: row.tickets,
        revenue: row.revenue,
        orders: row.orders,
      })),
    };
  }

  /** Bomboniere: itens mais vendidos e receita por produto. */
  async getTopProducts(query: AnalyticsQueryDto) {
    const range = this.resolvePeriod(query);
    const limit = query.limit ?? 10;

    const rows = await this.orderModel
      .aggregate<{
        _id: Types.ObjectId;
        name: string;
        category: string;
        quantity: number;
        revenue: number;
      }>([
        ...this.paidOrdersStages(range),
        { $unwind: '$products' },
        {
          $group: {
            _id: '$products.product',
            quantity: { $sum: '$products.quantity' },
            revenue: { $sum: '$products.pricePaid' },
          },
        },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productDoc',
          },
        },
        { $unwind: { path: '$productDoc', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            quantity: 1,
            revenue: 1,
            name: '$productDoc.name',
            category: '$productDoc.category',
          },
        },
        { $sort: { quantity: -1 } },
        { $limit: limit },
      ])
      .exec();

    return {
      period: this.describePeriod(range),
      items: rows.map((row) => ({
        productId: row._id?.toString() ?? null,
        name: row.name ?? 'Produto removido',
        category: row.category ?? null,
        quantity: row.quantity,
        revenue: row.revenue,
      })),
    };
  }

  /** Estoque da bomboniere que exige ação: esgotado ou abaixo do limite. */
  async getStockAlerts() {
    const products = await this.productModel
      .find({ quantity: { $lte: LOW_STOCK_THRESHOLD } })
      .sort({ quantity: 1 })
      .exec();

    return {
      threshold: LOW_STOCK_THRESHOLD,
      items: products.map((product) => ({
        productId: product._id.toString(),
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        isAvailable: product.isAvailable,
        status: product.quantity <= 0 ? 'esgotado' : 'baixo',
      })),
    };
  }

  private describePeriod(range: ResolvedPeriod) {
    return {
      period: range.period,
      from: range.from,
      to: range.to,
      timeZone: CINEMA_TIME_ZONE,
    };
  }

  /**
   * Recorte comum de todas as métricas: só pedido pago, e a data considerada
   * é a da aprovação (`ticketGeneratedAt`), com a criação como retaguarda
   * para pedidos antigos que não têm o campo.
   */
  private paidOrdersStages(range: ResolvedPeriod): PipelineStage[] {
    return [
      { $match: { status: OrderStatus.PAYMENT_APPROVED } },
      {
        $addFields: {
          paidAt: { $ifNull: ['$ticketGeneratedAt', '$createdAt'] },
        },
      },
      { $match: { paidAt: { $gte: range.from, $lte: range.to } } },
    ];
  }

  private joinSessionStages(): PipelineStage[] {
    return [
      {
        $lookup: {
          from: 'sessions',
          localField: 'session',
          foreignField: '_id',
          as: 'sessionDoc',
        },
      },
      { $unwind: { path: '$sessionDoc', preserveNullAndEmptyArrays: true } },
    ];
  }

  private async getSessionsCapacity(
    sessionIds: Types.ObjectId[],
  ): Promise<Map<string, number>> {
    if (sessionIds.length === 0) {
      return new Map();
    }

    const rows = await this.sessionModel
      .aggregate<{ _id: Types.ObjectId; capacity: number }>([
        { $match: { _id: { $in: sessionIds } } },
        {
          $project: { capacity: { $size: { $ifNull: ['$seats', []] } } },
        },
      ])
      .exec();

    return new Map(rows.map((row) => [row._id.toString(), row.capacity]));
  }

  private startOfCinemaDay(reference: Date): Date {
    // O Brasil não tem mais horário de verão, então o deslocamento é fixo:
    // montar a meia-noite local como -03:00 é suficiente e não depende de o
    // servidor estar no fuso certo.
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: CINEMA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(reference);

    return new Date(`${localDate}T00:00:00-03:00`);
  }

  private startOfCinemaMonth(reference: Date): Date {
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: CINEMA_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(reference);

    const [year, month] = localDate.split('-');

    return new Date(`${year}-${month}-01T00:00:00-03:00`);
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }
}
