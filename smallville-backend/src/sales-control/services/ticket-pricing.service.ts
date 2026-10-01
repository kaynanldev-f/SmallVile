import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from 'src/session/schemas/session.schema';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';
import {
  TicketPriceRule,
  TicketPriceRuleDocument,
} from '../schemas/ticket-price-rule.schema';
import { SALES_CONTROL_MESSAGES } from '../messages/sales-control.message';
import {
  getCinemaWeekday,
  parseCinemaDate,
  WEEKDAY_LABEL,
} from '../constants/weekday';

/** O mínimo que o cálculo de preço e de disponibilidade precisa saber. */
export interface SessionSaleSource {
  _id?: unknown;
  cinemaId?: unknown;
  dateTime: string;
  price: number;
  priceFull?: number | null;
  priceHalf?: number | null;
  salesEnabled?: boolean;
  salesStartAt?: Date | null;
  salesEndAt?: Date | null;
}

export type PricingSource = 'sessao' | 'regra' | 'padrao';

export interface ResolvedPricing {
  fullPrice: number;
  halfPrice: number;
  /** De onde veio o preço: preço próprio da sessão, regra ou valor padrão. */
  source: PricingSource;
  appliedRule?: {
    id: string;
    name: string;
    weekday: number | null;
    weekdayLabel: string;
  };
}

export interface SalesAvailability {
  enabled: boolean;
  onSale: boolean;
  reason?: string;
  startsAt?: Date | null;
  endsAt?: Date | null;
}

/** Um preço só é configuração quando existe e vale alguma coisa. */
const configuredPrice = (value?: number | null): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? value
    : null;

@Injectable()
export class TicketPricingService {
  constructor(
    @InjectModel(TicketPriceRule.name)
    private readonly ruleModel: Model<TicketPriceRuleDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async findSessionOrFail(sessionId: string): Promise<SessionDocument> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException(SALES_CONTROL_MESSAGES.SESSION_NOT_FOUND);
    }

    const session = await this.sessionModel.findById(sessionId).exec();

    if (!session) {
      throw new NotFoundException(SALES_CONTROL_MESSAGES.SESSION_NOT_FOUND);
    }

    return session;
  }

  /** Preço vigente de uma sessão. */
  async resolveForSession(
    session: SessionSaleSource,
  ): Promise<ResolvedPricing> {
    const rule = await this.findMatchingRule(session);

    // Só conta como preço configurado o que é um preço de verdade.
    const sessionFull = configuredPrice(session.priceFull);
    const sessionHalf = configuredPrice(session.priceHalf);

    const fullPrice =
      sessionFull ?? configuredPrice(rule?.fullPrice) ?? session.price ?? 0;

    const halfPrice =
      sessionHalf ??
      configuredPrice(rule?.halfPrice) ??
      Math.round(fullPrice / 2);

    const source: PricingSource =
      sessionFull != null || sessionHalf != null
        ? 'sessao'
        : rule
          ? 'regra'
          : 'padrao';

    return {
      fullPrice,
      halfPrice,
      source,
      ...(rule
        ? {
            appliedRule: {
              id: rule._id.toString(),
              name: rule.name,
              weekday: rule.weekday ?? null,
              weekdayLabel:
                rule.weekday == null
                  ? 'Todos os dias'
                  : WEEKDAY_LABEL[rule.weekday],
            },
          }
        : {}),
    };
  }

  async resolveForSessionId(sessionId: string): Promise<ResolvedPricing> {
    const session = await this.findSessionOrFail(sessionId);
    return this.resolveForSession(session);
  }

  priceFor(pricing: ResolvedPricing, type: TicketType): number {
    return type === TicketType.HALF ? pricing.halfPrice : pricing.fullPrice;
  }

  /**
   * Situação da venda: habilitada pelo administrador e dentro da janela
   * configurada.
   */
  describeAvailability(
    session: SessionSaleSource,
    now: Date = new Date(),
  ): SalesAvailability {
    const enabled = session.salesEnabled !== false;
    const startsAt = session.salesStartAt ?? null;
    const endsAt = session.salesEndAt ?? null;

    // Sessão que já começou não volta a estar à venda por nenhuma
    // configuração, então esta é a primeira pergunta. `parseCinemaDate` lê o
    // "DD/MM/AAAA HH:MM" gravado no fuso do cinema e devolve o instante real,
    // que é comparável com `now` em qualquer fuso de servidor.
    const startedAt = parseCinemaDate(session.dateTime);

    if (startedAt && startedAt.getTime() < now.getTime()) {
      return {
        enabled,
        onSale: false,
        reason: SALES_CONTROL_MESSAGES.SESSION_ALREADY_STARTED,
        startsAt,
        endsAt,
      };
    }

    if (!enabled) {
      return {
        enabled,
        onSale: false,
        reason: SALES_CONTROL_MESSAGES.SALES_DISABLED,
        startsAt,
        endsAt,
      };
    }

    if (startsAt && now < new Date(startsAt)) {
      return {
        enabled,
        onSale: false,
        reason: SALES_CONTROL_MESSAGES.SALES_NOT_STARTED,
        startsAt,
        endsAt,
      };
    }

    if (endsAt && now > new Date(endsAt)) {
      return {
        enabled,
        onSale: false,
        reason: SALES_CONTROL_MESSAGES.SALES_FINISHED,
        startsAt,
        endsAt,
      };
    }

    return { enabled, onSale: true, startsAt, endsAt };
  }

  /**
   * Porta de entrada da regra no servidor: a compra só passa se a sessão
   * estiver realmente à venda.
   */
  assertOnSale(session: SessionSaleSource, now: Date = new Date()): void {
    const availability = this.describeAvailability(session, now);

    if (!availability.onSale) {
      throw new BadRequestException(
        availability.reason ?? SALES_CONTROL_MESSAGES.SALES_DISABLED,
      );
    }
  }

  async assertSessionOnSale(sessionId: string): Promise<void> {
    const session = await this.findSessionOrFail(sessionId);
    this.assertOnSale(session);
  }

  /**
   * Regra aplicável, da mais específica para a mais geral: dia + cinema,
   * depois só o dia, depois só o cinema e por fim a regra padrão da rede.
   */
  private async findMatchingRule(
    session: SessionSaleSource,
  ): Promise<TicketPriceRuleDocument | null> {
    const weekday = getCinemaWeekday(session.dateTime);
    const cinemaId = this.extractCinemaId(session);

    const rules = await this.ruleModel
      .find({
        active: true,
        // Regra sem preço não é tabela de preço — é registro incompleto, e
        // não pode competir com o preço da sessão.
        fullPrice: { $gt: 0 },
        weekday: { $in: weekday === null ? [null] : [weekday, null] },
        cinema: { $in: cinemaId ? [cinemaId, null] : [null] },
      })
      .exec();

    if (rules.length === 0) {
      return null;
    }

    const score = (rule: TicketPriceRuleDocument): number =>
      (rule.cinema ? 2 : 0) + (rule.weekday != null ? 1 : 0);

    return rules.reduce((best, current) =>
      score(current) > score(best) ? current : best,
    );
  }

  private extractCinemaId(session: SessionSaleSource): Types.ObjectId | null {
    const cinema: unknown = session.cinemaId;

    if (cinema instanceof Types.ObjectId) {
      return cinema;
    }

    if (typeof cinema === 'string' && Types.ObjectId.isValid(cinema)) {
      return new Types.ObjectId(cinema);
    }

    const nested = (cinema as { _id?: Types.ObjectId } | null)?._id;

    return nested ?? null;
  }
}
