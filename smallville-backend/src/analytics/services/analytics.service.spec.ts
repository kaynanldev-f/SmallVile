import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsPeriod } from '../enums/analytics-period.enum';
import { Order } from 'src/orders/schemas/order.schema';
import { OrderStatus } from 'src/orders/enums/order-status.enum';
import { Payment } from 'src/payments/schemas/payment.schema';
import { PaymentStatus } from 'src/payments/enums/payment-status.enum';
import { PaymentMethod } from 'src/payments/enums/payment-method.enum';
import { Product } from 'src/products/schema/products.schema';
import { Session } from 'src/session/schemas/session.schema';

describe('AnalyticsService (Unitário)', () => {
  let service: AnalyticsService;

  const orderAggregateExec = jest.fn();
  const paymentAggregateExec = jest.fn();
  const sessionAggregateExec = jest.fn();
  const productFindExec = jest.fn();

  // O pipeline é guardado para que os testes possam conferir o recorte
  // aplicado (status aprovado e janela de datas), e não só o resultado.
  type PipelineStageMock = Record<string, unknown> & {
    $match?: { status?: string; paidAt?: unknown };
  };
  type Pipeline = PipelineStageMock[];

  const orderModelMock = {
    aggregate: jest.fn((pipeline?: Pipeline) => {
      void pipeline;
      return { exec: orderAggregateExec };
    }),
  };
  const paymentModelMock = {
    aggregate: jest.fn((pipeline?: Pipeline) => {
      void pipeline;
      return { exec: paymentAggregateExec };
    }),
  };
  const sessionModelMock = {
    aggregate: jest.fn(() => ({ exec: sessionAggregateExec })),
  };
  const productModelMock = {
    find: jest.fn(() => ({
      sort: jest.fn(() => ({ exec: productFindExec })),
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    orderAggregateExec.mockResolvedValue([]);
    paymentAggregateExec.mockResolvedValue([]);
    sessionAggregateExec.mockResolvedValue([]);
    productFindExec.mockResolvedValue([]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: getModelToken(Payment.name), useValue: paymentModelMock },
        { provide: getModelToken(Product.name), useValue: productModelMock },
        { provide: getModelToken(Session.name), useValue: sessionModelMock },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('período', () => {
    it('exige as datas no período personalizado', () => {
      expect(() =>
        service.resolvePeriod({ period: AnalyticsPeriod.CUSTOM }),
      ).toThrow(BadRequestException);
    });

    it('recusa intervalo invertido', () => {
      expect(() =>
        service.resolvePeriod({
          period: AnalyticsPeriod.CUSTOM,
          from: new Date('2026-08-20'),
          to: new Date('2026-08-10'),
        }),
      ).toThrow(BadRequestException);
    });

    it('respeita o intervalo personalizado informado', () => {
      const from = new Date('2026-08-01T00:00:00-03:00');
      const to = new Date('2026-08-18T23:59:00-03:00');

      expect(
        service.resolvePeriod({ period: AnalyticsPeriod.CUSTOM, from, to }),
      ).toEqual({ period: AnalyticsPeriod.CUSTOM, from, to });
    });

    it('monta a janela dos últimos 7 dias a partir de hoje', () => {
      const range = service.resolvePeriod({
        period: AnalyticsPeriod.LAST_7_DAYS,
      });

      const days =
        (range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24);

      // Hoje mais os seis dias anteriores.
      expect(days).toBeGreaterThan(6);
      expect(days).toBeLessThan(7.1);
    });
  });

  describe('indicadores', () => {
    const range = {
      period: AnalyticsPeriod.LAST_30_DAYS,
      from: new Date('2026-07-20T00:00:00-03:00'),
      to: new Date('2026-08-18T23:59:00-03:00'),
    };

    it('agrega somente pedidos com pagamento aprovado, no período', async () => {
      await service.getSummary(range);

      const pipeline = orderModelMock.aggregate.mock.calls[0][0] ?? [];

      expect(pipeline[0]).toEqual({
        $match: { status: OrderStatus.PAYMENT_APPROVED },
      });
      expect(pipeline[2]).toEqual({
        $match: { paidAt: { $gte: range.from, $lte: range.to } },
      });
    });

    it('calcula o ticket médio a partir da receita e dos pedidos', async () => {
      orderAggregateExec.mockResolvedValue([
        { revenue: 12000, orders: 4, tickets: 8, products: 3 },
      ]);

      await expect(service.getSummary(range)).resolves.toEqual({
        revenue: 12000,
        orders: 4,
        tickets: 8,
        products: 3,
        averageOrderValue: 3000,
      });
    });

    it('devolve zeros — e não divisão por zero — sem vendas no período', async () => {
      await expect(service.getSummary(range)).resolves.toEqual({
        revenue: 0,
        orders: 0,
        tickets: 0,
        products: 0,
        averageOrderValue: 0,
      });
    });

    it('devolve os sete dias da semana, inclusive os sem venda', async () => {
      orderAggregateExec.mockResolvedValue([
        { _id: 6, revenue: 9000, orders: 3, tickets: 6 },
      ]);

      const weekdays = await service.getWeekdayDistribution(range);

      expect(weekdays).toHaveLength(7);
      // `$dayOfWeek` usa 1 = domingo; sexta-feira é o índice 5 aqui.
      expect(weekdays[5]).toEqual({
        weekday: 5,
        label: 'Sexta-feira',
        revenue: 9000,
        orders: 3,
        tickets: 6,
      });
      expect(weekdays[0].revenue).toBe(0);
    });

    /** Base da tabela de comparação de vendas por data. */
    describe('comparação por data', () => {
      const shortRange = {
        period: AnalyticsPeriod.CUSTOM,
        from: new Date('2026-08-14T00:00:00-03:00'),
        to: new Date('2026-08-18T23:59:59-03:00'),
      };

      it('cobre todos os dias do intervalo selecionado', async () => {
        orderAggregateExec.mockResolvedValue([
          { date: '2026-08-15', revenue: 12000, orders: 4, tickets: 7 },
          { date: '2026-08-18', revenue: 3000, orders: 1, tickets: 2 },
        ]);

        const series = await service.getTimeseries(shortRange);

        expect(series.map((point) => point.date)).toEqual([
          '2026-08-14',
          '2026-08-15',
          '2026-08-16',
          '2026-08-17',
          '2026-08-18',
        ]);
      });

      it('preserva os números do dia com venda', async () => {
        orderAggregateExec.mockResolvedValue([
          { date: '2026-08-15', revenue: 12000, orders: 4, tickets: 7 },
        ]);

        const series = await service.getTimeseries(shortRange);

        expect(series[1]).toEqual({
          date: '2026-08-15',
          revenue: 12000,
          orders: 4,
          tickets: 7,
          weekday: 6,
          weekdayLabel: 'Sábado',
        });
      });

      it('zera — e não omite — o dia sem venda', async () => {
        orderAggregateExec.mockResolvedValue([]);

        const series = await service.getTimeseries(shortRange);

        expect(series).toHaveLength(5);
        expect(series.every((point) => point.revenue === 0)).toBe(true);
        expect(series.every((point) => point.orders === 0)).toBe(true);
      });

      it('agrupa a receita por dia no fuso do cinema', async () => {
        await service.getTimeseries(shortRange);

        const pipeline = orderModelMock.aggregate.mock.calls[0][0] ?? [];
        const group = pipeline.find(
          (stage) => '$group' in stage,
        ) as unknown as {
          $group: { _id: { $dateToString: { timezone: string } } };
        };

        expect(group.$group._id.$dateToString.timezone).toBe(
          'America/Sao_Paulo',
        );
      });
    });

    it('mostra apenas as formas de pagamento realmente usadas', async () => {
      paymentAggregateExec.mockResolvedValue([
        { _id: PaymentMethod.PIX, amount: 10000, count: 5 },
      ]);

      const methods = await service.getPaymentMethods(range);

      expect(methods).toEqual([
        {
          method: PaymentMethod.PIX,
          label: 'PIX',
          amount: 10000,
          count: 5,
          share: 100,
        },
      ]);

      const pipeline = paymentModelMock.aggregate.mock.calls[0][0] ?? [];
      expect(pipeline[1].$match?.status).toBe(PaymentStatus.APPROVED);
    });
  });

  describe('rankings', () => {
    it('calcula a ocupação real dos filmes a partir da capacidade das sessões', async () => {
      const sessionId = new Types.ObjectId();
      const movieId = new Types.ObjectId();

      orderAggregateExec.mockResolvedValue([
        {
          _id: movieId,
          title: 'Interestelar',
          tickets: 30,
          revenue: 90000,
          sessions: [sessionId],
        },
      ]);
      sessionAggregateExec.mockResolvedValue([
        { _id: sessionId, capacity: 60 },
      ]);

      const result = await service.getTopMovies({});

      expect(result.items[0]).toEqual(
        expect.objectContaining({
          title: 'Interestelar',
          tickets: 30,
          sessions: 1,
          occupancyRate: 50,
        }),
      );
    });

    it('identifica produto removido do catálogo sem quebrar o ranking', async () => {
      orderAggregateExec.mockResolvedValue([
        { _id: new Types.ObjectId(), quantity: 12, revenue: 6000 },
      ]);

      const result = await service.getTopProducts({});

      expect(result.items[0].name).toBe('Produto removido');
      expect(result.items[0].quantity).toBe(12);
    });
  });

  it('lista o estoque que exige ação com o mesmo limite do alerta', async () => {
    productFindExec.mockResolvedValue([
      {
        _id: new Types.ObjectId(),
        name: 'Pipoca Grande',
        category: 'Salgado',
        quantity: 0,
        isAvailable: true,
      },
      {
        _id: new Types.ObjectId(),
        name: 'Refrigerante',
        category: 'Bebida',
        quantity: 4,
        isAvailable: true,
      },
    ]);

    const alerts = await service.getStockAlerts();

    expect(alerts.threshold).toBe(10);
    expect(alerts.items[0].status).toBe('esgotado');
    expect(alerts.items[1].status).toBe('baixo');
  });
});
