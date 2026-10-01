import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from 'src/session/schemas/session.schema';
import {
  TicketPriceRule,
  TicketPriceRuleDocument,
} from '../schemas/ticket-price-rule.schema';
import { CreatePriceRuleDto } from '../dtos/create-price-rule.dto';
import { UpdatePriceRuleDto } from '../dtos/update-price-rule.dto';
import { UpdateSessionSalesDto } from '../dtos/update-session-sales.dto';
import { SALES_CONTROL_MESSAGES } from '../messages/sales-control.message';
import { WEEKDAY_LABEL } from '../constants/weekday';
import { TicketPricingService } from './ticket-pricing.service';

const DUPLICATE_KEY_ERROR = 11000;

@Injectable()
export class SalesControlService {
  constructor(
    @InjectModel(TicketPriceRule.name)
    private readonly ruleModel: Model<TicketPriceRuleDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    private readonly pricingService: TicketPricingService,
  ) {}

  async listRules() {
    const rules = await this.ruleModel
      .find()
      .populate({ path: 'cinema', select: 'name city' })
      .sort({ weekday: 1, createdAt: 1 })
      .exec();

    return rules.map((rule) => ({
      ...rule.toJSON(),
      weekdayLabel:
        rule.weekday == null ? 'Todos os dias' : WEEKDAY_LABEL[rule.weekday],
    }));
  }

  async createRule(dto: CreatePriceRuleDto): Promise<TicketPriceRuleDocument> {
    this.assertPricesConsistent(dto.fullPrice, dto.halfPrice);

    try {
      return await this.ruleModel.create({
        name: dto.name,
        weekday: dto.weekday ?? null,
        cinema: dto.cinemaId ? new Types.ObjectId(dto.cinemaId) : null,
        fullPrice: dto.fullPrice,
        halfPrice: dto.halfPrice,
        active: dto.active ?? true,
      });
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(SALES_CONTROL_MESSAGES.RULE_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async updateRule(
    id: string,
    dto: UpdatePriceRuleDto,
  ): Promise<TicketPriceRuleDocument> {
    const rule = await this.findRuleOrFail(id);

    const fullPrice = dto.fullPrice ?? rule.fullPrice;
    const halfPrice = dto.halfPrice ?? rule.halfPrice;
    this.assertPricesConsistent(fullPrice, halfPrice);

    if (dto.name !== undefined) rule.name = dto.name;
    if (dto.weekday !== undefined) rule.weekday = dto.weekday ?? null;
    if (dto.cinemaId !== undefined) {
      rule.cinema = dto.cinemaId ? new Types.ObjectId(dto.cinemaId) : null;
    }
    if (dto.fullPrice !== undefined) rule.fullPrice = dto.fullPrice;
    if (dto.halfPrice !== undefined) rule.halfPrice = dto.halfPrice;
    if (dto.active !== undefined) rule.active = dto.active;

    try {
      return await rule.save();
    } catch (error) {
      if (this.isDuplicateKeyError(error)) {
        throw new ConflictException(SALES_CONTROL_MESSAGES.RULE_ALREADY_EXISTS);
      }
      throw error;
    }
  }

  async removeRule(id: string): Promise<void> {
    const rule = await this.findRuleOrFail(id);
    await rule.deleteOne();
  }

  /**
   * Visão do painel "Controle de Vendas": cada sessão com o preço que está
   * realmente valendo hoje e a situação da venda.
   */
  async listSessionsForControl(cinemaId?: string) {
    const filter: Record<string, unknown> = {};

    if (cinemaId && Types.ObjectId.isValid(cinemaId)) {
      filter.cinemaId = new Types.ObjectId(cinemaId);
    }

    const sessions = await this.sessionModel
      .find(filter)
      .populate({ path: 'cinemaId', select: 'name city' })
      .sort({ dateTime: 1 })
      .exec();

    return Promise.all(
      sessions.map(async (session) => this.describeSession(session)),
    );
  }

  async updateSessionSales(
    sessionId: string,
    dto: UpdateSessionSalesDto,
  ): Promise<Record<string, unknown>> {
    const session = await this.pricingService.findSessionOrFail(sessionId);

    if (dto.salesEnabled !== undefined) {
      session.salesEnabled = dto.salesEnabled;
    }
    if (dto.salesStartAt !== undefined) {
      session.salesStartAt = dto.salesStartAt ?? undefined;
    }
    if (dto.salesEndAt !== undefined) {
      session.salesEndAt = dto.salesEndAt ?? undefined;
    }
    if (dto.priceFull !== undefined) {
      session.priceFull = dto.priceFull ?? undefined;
    }
    if (dto.priceHalf !== undefined) {
      session.priceHalf = dto.priceHalf ?? undefined;
    }

    if (
      session.salesStartAt &&
      session.salesEndAt &&
      new Date(session.salesStartAt) >= new Date(session.salesEndAt)
    ) {
      throw new BadRequestException(
        SALES_CONTROL_MESSAGES.INVALID_SALES_WINDOW,
      );
    }

    if (session.priceFull != null && session.priceHalf != null) {
      this.assertPricesConsistent(session.priceFull, session.priceHalf);
    }

    await session.save();

    return this.describeSession(session);
  }

  /** Sessão + preço vigente + situação da venda, no formato da tela. */
  async describeSession(
    session: SessionDocument,
  ): Promise<Record<string, unknown>> {
    const pricing = await this.pricingService.resolveForSession(session);
    const availability = this.pricingService.describeAvailability(session);

    return {
      ...(session.toJSON() as Record<string, unknown>),
      pricing,
      sales: availability,
    };
  }

  private async findRuleOrFail(id: string): Promise<TicketPriceRuleDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException(SALES_CONTROL_MESSAGES.RULE_NOT_FOUND);
    }

    const rule = await this.ruleModel.findById(id).exec();

    if (!rule) {
      throw new NotFoundException(SALES_CONTROL_MESSAGES.RULE_NOT_FOUND);
    }

    return rule;
  }

  private assertPricesConsistent(fullPrice: number, halfPrice: number): void {
    if (halfPrice > fullPrice) {
      throw new BadRequestException(SALES_CONTROL_MESSAGES.HALF_ABOVE_FULL);
    }
  }

  private isDuplicateKeyError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      (error as { code?: number }).code === DUPLICATE_KEY_ERROR
    );
  }
}
