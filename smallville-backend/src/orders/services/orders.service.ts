import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import {
  EDITABLE_STATUSES,
  OrderStatus,
  PAYABLE_STATUSES,
  REFUND_ELIGIBLE_STATUSES,
  REFUND_STATUSES,
  TERMINAL_STATUSES,
  TICKET_ELIGIBLE_STATUSES,
} from '../enums/order-status.enum';
import { QueryOrdersDto } from '../dtos/query-orders.dto';
import { RequestCancellationDto } from '../dtos/request-cancellation.dto';
import { RequestRefundDto } from '../dtos/request-refund.dto';
import { ApproveRefundDto } from '../dtos/approve-refund.dto';
import { RejectRefundDto } from '../dtos/reject-refund.dto';
import { QueryRefundsDto } from '../dtos/query-refunds.dto';
import { OrdersAuditService } from './orders-audit.service';
import {
  OrderAuditOperation,
  OrderAuditResult,
} from '../enums/order-audit-operation.enum';
import {
  SESSION_INFO_GATEWAY,
  type SessionInfoGateway,
} from './session-info.gateway';
import { ORDERS_MESSAGES } from '../messages/orders.message';
import { ProductsService } from 'src/products/service/products.service';
import { Ticket, TicketDocument } from 'src/tickets/schema/ticket.schema';
import { User, UserDocument } from 'src/users/schemas/users.schema';
import { calculateAge } from 'src/common/utils/age-validation';
import {
  MOVIE_INFO_GATEWAY,
  type MovieInfoGateway,
} from './movie-info.gateway';
import { CreateOrderDto } from '../dtos/create-order.dto';
import { UpdateOrderProductsDto } from '../dtos/update-order-products.dto';
import { Session, SessionDocument } from 'src/session/schemas/session.schema';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { TicketStatus } from 'src/tickets/enums/ticket-status.enum';
import { TicketCodeService } from 'src/tickets/service/ticket-code.service';
import { OrderReceiptService } from './order-receipt.service';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { NOTIFICATION_CONTENT } from 'src/notifications/messages/notification-content';
import { LoyaltyService } from 'src/loyalty/services/loyalty.service';
import { TicketPricingService } from 'src/sales-control/services/ticket-pricing.service';
import { LOW_STOCK_THRESHOLD } from 'src/products/constants/stock.constants';

interface AuditContext {
  userId: string;
  sessionId: string;
  // Ausente nos fluxos internos (pagamento), onde não há decisão de
  // autorização a tomar — só as rotas HTTP preenchem o papel do requisitante.
  role?: UserRole;
}

// Campos que o pedido carrega ao ser listado/detalhado, para que a tela não
// precise de uma requisição por filme, sessão, ingresso e produto.
const ORDER_DETAIL_POPULATE = [
  { path: 'user', select: 'name surname email' },
  {
    path: 'session',
    select:
      'movieTitle movieId roomName roomType language dateTime price cinemaId',
    populate: [
      { path: 'cinemaId', select: 'name city state' },
      { path: 'movieId', select: 'title classification banner duration' },
    ],
  },
  { path: 'tickets' },
  { path: 'products.product', select: 'name category size price imageUrl' },
];

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Ticket.name)
    private readonly ticketModel: Model<TicketDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
    @InjectConnection()
    private readonly connection: Connection,
    private readonly auditService: OrdersAuditService,
    private readonly productsService: ProductsService,
    @Inject(SESSION_INFO_GATEWAY)
    private readonly sessionInfoGateway: SessionInfoGateway,
    @Inject(MOVIE_INFO_GATEWAY)
    private readonly movieInfoGateway: MovieInfoGateway,
    private readonly ticketCodeService: TicketCodeService,
    private readonly receiptService: OrderReceiptService,
    private readonly notificationsService: NotificationsService,
    private readonly loyaltyService: LoyaltyService,
    private readonly pricingService: TicketPricingService,
  ) {}

  private isAdmin(ctx: AuditContext): boolean {
    return ctx.role === UserRole.ADMIN;
  }

  /**
   * Listagem de pedidos com a regra de visibilidade aplicada no servidor: o
   * administrador enxerga todos os pedidos, o usuário comum apenas os seus.
   */
  async findAll(query: QueryOrdersDto, ctx: AuditContext) {
    const filter: Record<string, unknown> = {};

    if (!this.isAdmin(ctx)) {
      filter.user = new Types.ObjectId(ctx.userId);
    }

    if (query.status) {
      filter.status = query.status;
    }

    // Só o administrador pode filtrar por usuário; para os demais o filtro
    // já está travado no próprio id.
    if (query.userId && this.isAdmin(ctx)) {
      filter.user = new Types.ObjectId(query.userId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate(ORDER_DETAIL_POPULATE)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    if (total === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        message: ORDERS_MESSAGES.NO_ORDERS_FOUND,
      };
    }

    return { items, total, page, limit };
  }

  // 5.0 Fluxo Principal (5-6): detalhes da compra.
  // FA03 — Pedido não pertence ao usuário / não encontrado.

  /** Busca um pedido aplicando a regra de acesso no servidor. */
  async findOneForRequester(
    orderId: string,
    ctx: AuditContext,
    operation: OrderAuditOperation = OrderAuditOperation.VIEW_DETAILS,
  ): Promise<OrderDocument> {
    let order: OrderDocument | null = null;

    if (Types.ObjectId.isValid(orderId)) {
      order = await this.orderModel
        .findById(orderId)
        .populate(ORDER_DETAIL_POPULATE);
    }

    if (!order) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation,
        result: OrderAuditResult.FAILURE,
        sessionId: ctx.sessionId,
      });
      throw new NotFoundException(ORDERS_MESSAGES.ORDER_NOT_FOUND);
    }

    this.assertCanAccess(order, ctx, operation);

    return order;
  }

  /**
   * Variante para as operações que alteram o pedido (cancelamento,
   * reembolso, edição de produtos).
   */
  async findOneOwnedByUser(
    orderId: string,
    userId: string,
    ctx: AuditContext,
    operation: OrderAuditOperation = OrderAuditOperation.VIEW_DETAILS,
  ): Promise<OrderDocument> {
    let order: OrderDocument | null = null;

    if (Types.ObjectId.isValid(orderId)) {
      order = await this.orderModel
        .findById(orderId)
        .populate({ path: 'session' });
    }

    if (!order) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation,
        result: OrderAuditResult.FAILURE,
        sessionId: ctx.sessionId,
      });
      throw new NotFoundException(ORDERS_MESSAGES.ORDER_NOT_FOUND);
    }

    if (this.extractOwnerId(order) !== userId) {
      await this.registerDeniedAccess(orderId, ctx, operation);
      throw new ForbiddenException(ORDERS_MESSAGES.ORDER_FORBIDDEN);
    }

    return order;
  }

  private assertCanAccess(
    order: OrderDocument,
    ctx: AuditContext,
    operation: OrderAuditOperation,
  ): void {
    if (this.isAdmin(ctx)) {
      return;
    }

    // `user` pode chegar populado; comparamos sempre pelo id.
    const ownerId = this.extractOwnerId(order);

    if (ownerId !== ctx.userId) {
      void this.registerDeniedAccess(order._id.toString(), ctx, operation);
      throw new ForbiddenException(ORDERS_MESSAGES.ORDER_FORBIDDEN);
    }
  }

  private registerDeniedAccess(
    orderId: string,
    ctx: AuditContext,
    operation: OrderAuditOperation,
  ): Promise<unknown> {
    return this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation,
      result: OrderAuditResult.DENIED,
      sessionId: ctx.sessionId,
    });
  }

  /** Id de uma referência que pode chegar populada. */
  private extractRefId(ref: unknown): string {
    if (ref instanceof Types.ObjectId) {
      return ref.toString();
    }

    return (ref as { _id: Types.ObjectId })._id.toString();
  }

  private extractOwnerId(order: OrderDocument): string {
    return this.extractRefId(order.user);
  }

  // Regra: o ingresso só é disponibilizado quando o pagamento estiver
  // aprovado, o pedido estiver confirmado e o ingresso tiver sido gerado.
  private isTicketAvailable(order: OrderDocument): boolean {
    return (
      order.paymentApproved &&
      TICKET_ELIGIBLE_STATUSES.includes(order.status) &&
      !!order.ticketGeneratedAt &&
      order.tickets?.length > 0
    );
  }

  /**
   * Dados reais do ingresso da compra: filme, sessão, sala, assentos, número
   * do ingresso, QR Code, cliente e valores.
   */
  async viewTicket(orderId: string, ctx: AuditContext) {
    const order = await this.assertTicketAvailable(
      orderId,
      ctx,
      OrderAuditOperation.VIEW_TICKET,
    );

    const data = await this.receiptService.buildPdfData(order._id.toString());

    return { ...data, pdfUrl: order.ticketPdfUrl };
  }

  // Devolve o PDF em si.
  async downloadTicket(
    orderId: string,
    ctx: AuditContext,
  ): Promise<{ fileName: string; pdf: Buffer }> {
    const order = await this.assertTicketAvailable(
      orderId,
      ctx,
      OrderAuditOperation.DOWNLOAD_TICKET,
    );

    const pdf = await this.receiptService.generatePdf(order._id.toString());

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.DOWNLOAD_TICKET,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    return { fileName: `ingresso-${order._id.toString()}.pdf`, pdf };
  }

  // Reenvio do e-mail com o ingresso, para quando o SMTP falhou na compra
  // ou o usuário simplesmente não recebeu.
  async resendConfirmationEmail(orderId: string, ctx: AuditContext) {
    const order = await this.assertTicketAvailable(
      orderId,
      ctx,
      OrderAuditOperation.VIEW_TICKET,
    );

    const result = await this.receiptService.deliver(order._id.toString());

    if (!result.emailSent) {
      throw new ServiceUnavailableException(
        ORDERS_MESSAGES.CONFIRMATION_EMAIL_FAILED,
      );
    }

    return { message: ORDERS_MESSAGES.CONFIRMATION_EMAIL_SENT };
  }

  private async assertTicketAvailable(
    orderId: string,
    ctx: AuditContext,
    operation: OrderAuditOperation,
  ): Promise<OrderDocument> {
    const order = await this.findOneForRequester(orderId, ctx, operation);

    if (!this.isTicketAvailable(order)) {
      await this.registerDeniedAccess(orderId, ctx, operation);
      throw new BadRequestException(ORDERS_MESSAGES.TICKET_NOT_AVAILABLE);
    }

    return order;
  }

  async getReceipt(orderId: string, ctx: AuditContext) {
    const order = await this.findOneForRequester(
      orderId,
      ctx,
      OrderAuditOperation.VIEW_RECEIPT,
    );

    if (!order.receiptUrl) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation: OrderAuditOperation.VIEW_RECEIPT,
        result: OrderAuditResult.DENIED,
        sessionId: ctx.sessionId,
      });
      throw new BadRequestException(ORDERS_MESSAGES.RECEIPT_NOT_AVAILABLE);
    }

    return { receiptUrl: order.receiptUrl };
  }

  // Regras de cancelamento: prazo permitido, evento não iniciado e
  // política da empresa.
  private async isCancellationAllowed(order: OrderDocument): Promise<boolean> {
    if (TERMINAL_STATUSES.includes(order.status)) {
      return false;
    }

    if (order.cancellationDeadline && new Date() > order.cancellationDeadline) {
      return false;
    }

    const sessionStart = await this.sessionInfoGateway.getSessionStartDate(
      this.extractSessionId(order),
    );
    if (sessionStart && new Date() >= sessionStart) {
      return false;
    }

    return this.checkCompanyCancellationPolicy(order);
  }

  // Placeholder para a política de cancelamento da empresa.
  private checkCompanyCancellationPolicy(order: OrderDocument): boolean {
    void order; // placeholder — regra real ainda não definida
    return true;
  }

  async requestCancellation(
    orderId: string,
    userId: string,
    dto: RequestCancellationDto,
    ctx: AuditContext,
  ) {
    const order = await this.findOneOwnedByUser(
      orderId,
      userId,
      ctx,
      OrderAuditOperation.REQUEST_CANCELLATION,
    );

    const allowed = await this.isCancellationAllowed(order);
    if (!allowed) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation: OrderAuditOperation.REQUEST_CANCELLATION,
        result: OrderAuditResult.DENIED,
        sessionId: ctx.sessionId,
      });
      throw new BadRequestException(ORDERS_MESSAGES.CANCELLATION_NOT_ALLOWED);
    }

    // Cancelamento de pedido já pago: os assentos voltam para a sessão, o
    // estoque da bomboniere é restituído e os ingressos emitidos deixam de
    // valer.
    await this.releaseReservation(order);

    order.status = OrderStatus.ORDER_CANCELLED;
    order.cancellation = {
      requestedAt: new Date(),
      requestedBy: new Types.ObjectId(userId),
      reason: dto.reason,
    };
    await order.save();

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.REQUEST_CANCELLATION,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.orderCancelled(orderId),
    );

    return { message: ORDERS_MESSAGES.CANCELLATION_REQUESTED, order };
  }

  // ----------------------------- Reembolso -----------------------------
  // O comprador abre a solicitação; o administrador a resolve. Aprovar
  // significa encerrar a compra — nada de dinheiro é movimentado aqui.

  /** Elegibilidade para ABRIR a solicitação. */
  private isRefundAllowed(order: OrderDocument): boolean {
    if (!order.paymentApproved) {
      return false;
    }

    // Uma solicitação por pedido: enquanto houver `requestedAt`, o botão não
    // volta — nem com a análise em aberto, nem depois de resolvida.
    return (
      REFUND_ELIGIBLE_STATUSES.includes(order.status) &&
      !order.refund?.requestedAt
    );
  }

  async requestRefund(
    orderId: string,
    userId: string,
    dto: RequestRefundDto,
    ctx: AuditContext,
  ) {
    const order = await this.findOneOwnedByUser(
      orderId,
      userId,
      ctx,
      OrderAuditOperation.REQUEST_REFUND,
    );

    if (!this.isRefundAllowed(order)) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation: OrderAuditOperation.REQUEST_REFUND,
        result: OrderAuditResult.DENIED,
        sessionId: ctx.sessionId,
      });
      throw new BadRequestException(ORDERS_MESSAGES.REFUND_NOT_ALLOWED);
    }

    // Guardado ANTES da troca de status: é o que diz, na hora da análise, se
    // o pedido ainda tem assento, estoque e ingresso ativos ou se o
    // cancelamento já devolveu tudo.
    const previousStatus = order.status;

    order.status = OrderStatus.REFUND_REQUESTED;
    order.refund = {
      requestedAt: new Date(),
      requestedBy: new Types.ObjectId(userId),
      reason: dto.reason,
      // Reembolso é sempre integral nesta etapa.
      amount: order.totalAmount,
      previousStatus,
    };
    await order.save();

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.REQUEST_REFUND,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    // Efeito colateral do evento, nunca o evento: a solicitação já está
    // gravada neste ponto, e uma falha ao avisar não pode derrubá-la.
    try {
      await this.announceRefundRequest(order);
    } catch (error) {
      this.logger.error(
        `Falha ao anunciar a solicitação de reembolso do pedido ${orderId}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return { message: ORDERS_MESSAGES.REFUND_REQUESTED, order };
  }

  /**
   * Avisos da solicitação aberta: o comprador confirma que o pedido chegou e
   * está em análise; a operação recebe o item de trabalho no sino, com o
   * `refundId` que a tela usa para abrir os detalhes.
   */
  private async announceRefundRequest(order: OrderDocument): Promise<void> {
    const orderId = order._id.toString();
    const amount = order.refund?.amount ?? order.totalAmount;

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.refundRequested(orderId, amount),
    );

    const buyer = await this.userModel
      .findById(this.extractOwnerId(order))
      .select('name surname')
      .lean()
      .exec();

    const buyerName = buyer
      ? `${buyer.name} ${buyer.surname ?? ''}`.trim()
      : undefined;

    await this.notificationsService.notifyAdmins(
      NOTIFICATION_CONTENT.refundRequestReceived(orderId, amount, buyerName),
    );
  }

  /** Trava de autorização da análise, no serviço. */
  private assertRefundReviewer(ctx: AuditContext): void {
    if (!this.isAdmin(ctx)) {
      throw new ForbiddenException(ORDERS_MESSAGES.REFUND_REVIEW_FORBIDDEN);
    }
  }

  /** Listagem administrativa das solicitações de reembolso. */
  async listRefundRequests(query: QueryRefundsDto, ctx: AuditContext) {
    this.assertRefundReviewer(ctx);

    const filter: Record<string, unknown> = {
      'refund.requestedAt': { $exists: true },
      status: query.status
        ? (query.status as unknown as OrderStatus)
        : { $in: REFUND_STATUSES },
    };

    if (query.userId) {
      filter.user = new Types.ObjectId(query.userId);
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const [items, total, pendingCount] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate(ORDER_DETAIL_POPULATE)
        .sort({ 'refund.requestedAt': -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
      // Independe do filtro da tela: é o número de pendências que o painel
      // mostra como badge, e ele não muda quando o admin filtra por
      // "aprovadas".
      this.orderModel
        .countDocuments({ status: OrderStatus.REFUND_REQUESTED })
        .exec(),
    ]);

    return {
      items,
      total,
      page,
      limit,
      pendingCount,
      ...(total === 0 ? { message: ORDERS_MESSAGES.NO_REFUND_REQUESTS } : {}),
    };
  }

  /**
   * Detalhe de uma solicitação para a análise, com o histórico do pedido.
   */
  async findRefundRequest(orderId: string, ctx: AuditContext) {
    this.assertRefundReviewer(ctx);

    const order = await this.findOneForRequester(
      orderId,
      ctx,
      OrderAuditOperation.VIEW_DETAILS,
    );

    if (!order.refund?.requestedAt) {
      throw new NotFoundException(ORDERS_MESSAGES.REFUND_REQUEST_NOT_FOUND);
    }

    const history = await this.auditService.findForOrder(orderId);

    return { order, history };
  }

  /** Carrega a solicitação garantindo que ela ainda pode ser decidida. */
  private async findRefundForResolution(
    orderId: string,
    ctx: AuditContext,
    operation: OrderAuditOperation,
  ): Promise<OrderDocument> {
    this.assertRefundReviewer(ctx);

    const order = await this.findOneForRequester(orderId, ctx, operation);

    if (!order.refund?.requestedAt) {
      throw new NotFoundException(ORDERS_MESSAGES.REFUND_REQUEST_NOT_FOUND);
    }

    const alreadyResolved = Boolean(order.refund.resolvedAt);

    if (alreadyResolved || order.status !== OrderStatus.REFUND_REQUESTED) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation,
        result: OrderAuditResult.DENIED,
        sessionId: ctx.sessionId,
      });

      throw new ConflictException(
        alreadyResolved
          ? ORDERS_MESSAGES.REFUND_ALREADY_RESOLVED
          : ORDERS_MESSAGES.REFUND_NOT_PENDING,
      );
    }

    return order;
  }

  /** Aprovação da solicitação pelo administrador. */
  async approveRefund(
    orderId: string,
    dto: ApproveRefundDto,
    ctx: AuditContext,
  ) {
    const order = await this.findRefundForResolution(
      orderId,
      ctx,
      OrderAuditOperation.APPROVE_REFUND,
    );

    // Devolve o que a compra ainda segurava. Idempotente por dentro: o
    // pedido que o usuário já cancelou não devolve nada de novo.
    await this.releaseReservation(order);

    order.status = OrderStatus.REFUND_APPROVED;
    order.refund.resolvedAt = new Date();
    order.refund.resolvedBy = new Types.ObjectId(ctx.userId);
    order.refund.resolutionReason = dto.resolutionReason;
    await order.save();

    await this.revokeLoyaltyPoints(order);

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.APPROVE_REFUND,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.refundApproved(
        orderId,
        order.refund.amount ?? order.totalAmount,
      ),
    );

    return { message: ORDERS_MESSAGES.REFUND_APPROVED, order };
  }

  /** Recusa da solicitação pelo administrador. */
  async rejectRefund(orderId: string, dto: RejectRefundDto, ctx: AuditContext) {
    const order = await this.findRefundForResolution(
      orderId,
      ctx,
      OrderAuditOperation.REJECT_REFUND,
    );

    order.status = OrderStatus.REFUND_REJECTED;
    order.refund.resolvedAt = new Date();
    order.refund.resolvedBy = new Types.ObjectId(ctx.userId);
    order.refund.resolutionReason = dto.resolutionReason;
    await order.save();

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.REJECT_REFUND,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.refundRejected(orderId, dto.resolutionReason),
    );

    return { message: ORDERS_MESSAGES.REFUND_REJECTED, order };
  }

  /** Estorna os pontos que a compra reembolsada havia gerado. */
  private async revokeLoyaltyPoints(order: OrderDocument): Promise<void> {
    try {
      await this.loyaltyService.revokeForOrder({
        userId: this.extractOwnerId(order),
        orderId: order._id.toString(),
      });
    } catch (error) {
      this.logger.error(
        `Falha ao estornar os pontos do pedido ${order._id.toString()}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async create(
    dto: CreateOrderDto,
    userId: string,
    ctx: AuditContext,
  ): Promise<OrderDocument> {
    const sessionInfo = await this.sessionInfoGateway.getSessionForOrder(
      dto.sessionId,
    );

    if (!sessionInfo) {
      await this.auditService.register({
        userId: ctx.userId,
        operation: OrderAuditOperation.CREATE_ORDER,
        result: OrderAuditResult.FAILURE,
        sessionId: ctx.sessionId,
      });
      throw new NotFoundException(ORDERS_MESSAGES.SESSION_NOT_FOUND);
    }

    const validSeatNumbers = new Set(
      sessionInfo.seats.map((s) => s.seatNumber),
    );
    const invalidSeats = dto.seats.filter(
      (s) => !validSeatNumbers.has(s.seatNumber),
    );

    if (invalidSeats.length > 0) {
      throw new BadRequestException(
        `Assento(s) inexistente(s) nesta sessão: ${invalidSeats
          .map((s) => s.seatNumber)
          .join(', ')}.`,
      );
    }

    // Controle de venda: sessão com venda encerrada ou fora do período
    // configurado não aceita pedido novo.
    const sessionDoc = await this.pricingService.findSessionOrFail(
      dto.sessionId,
    );
    this.pricingService.assertOnSale(sessionDoc);

    // Preço da inteira e da meia vêm da configuração do administrador (preço
    // próprio da sessão ou tabela de regras por dia/cinema).
    const pricing = await this.pricingService.resolveForSession(sessionDoc);

    const seats = dto.seats.map((seat) => ({
      seatNumber: seat.seatNumber,
      type: seat.type,
      pricePaid: this.pricingService.priceFor(pricing, seat.type),
    }));

    const ticketsTotal = seats.reduce(
      (total, seat) => total + seat.pricePaid,
      0,
    );

    const order = new this.orderModel({
      user: new Types.ObjectId(userId),
      session: new Types.ObjectId(dto.sessionId),
      seats,
      products: [],
      subtotalAmount: ticketsTotal,
      totalAmount: ticketsTotal,
      status: OrderStatus.ORDER_PLACED,
    });

    await order.save();

    await this.auditService.register({
      userId: ctx.userId,
      orderId: order._id.toString(),
      operation: OrderAuditOperation.CREATE_ORDER,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    return order;
  }

  async updateProducts(
    orderId: string,
    dto: UpdateOrderProductsDto,
    userId: string,
    ctx: AuditContext,
  ): Promise<OrderDocument> {
    const order = await this.findOneOwnedByUser(
      orderId,
      userId,
      ctx,
      OrderAuditOperation.UPDATE_PRODUCTS,
    );

    if (!EDITABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(ORDERS_MESSAGES.ORDER_NOT_EDITABLE);
    }

    // Busca os produtos e calcula o valor em centavos
    const productsWithPrice = await Promise.all(
      dto.products.map(async (item) => {
        const product = await this.productsService.findOne(item.productId);

        return {
          product: new Types.ObjectId(item.productId),
          quantity: item.quantity,
          pricePaid: product.price * item.quantity,
        };
      }),
    );

    order.products = productsWithPrice;

    const ticketsTotal = order.seats.reduce(
      (acc, seat) => acc + seat.pricePaid,
      0,
    );

    const productsTotal = productsWithPrice.reduce(
      (acc, item) => acc + item.pricePaid,
      0,
    );

    order.subtotalAmount = ticketsTotal + productsTotal;

    order.totalAmount = order.subtotalAmount - order.discountAmount;

    await order.save();

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.UPDATE_PRODUCTS,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    return order;
  }

  // ---------------------------------------------------------------------
  // Métodos de suporte ao módulo de pagamentos (payments).

  private extractSessionId(order: OrderDocument): string {
    return this.extractRefId(order.session);
  }

  // Usado pelo PaymentsService, que já validou a posse do pedido ao
  // iniciar o pagamento; aqui buscamos apenas por id.
  async findById(orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException(ORDERS_MESSAGES.ORDER_NOT_FOUND);
    }
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException(ORDERS_MESSAGES.ORDER_NOT_FOUND);
    }
    return order;
  }

  // Regra: "O sistema não deve permitir acesso a esta tela sem que o usuário
  // possua ao menos um ingresso ou produto da bomboniere".
  hasPurchasableItems(order: OrderDocument): boolean {
    return (order.seats?.length ?? 0) > 0 || (order.products?.length ?? 0) > 0;
  }

  // O pedido só aceita (nova) tentativa de pagamento enquanto não foi
  // pago, cancelado ou expirado.
  assertPayable(order: OrderDocument): void {
    if (!PAYABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(ORDERS_MESSAGES.ORDER_NOT_PAYABLE);
    }
  }

  // Validações que precisam acontecer ANTES de enviar a cobrança ao gateway:
  // sessão existente, classificação indicativa e disponibilidade dos
  // assentos.
  async validateBeforeCharge(
    order: OrderDocument,
    userId: string,
  ): Promise<void> {
    this.assertPayable(order);

    const user = await this.userModel.findById(userId).exec();
    if (!user) {
      throw new NotFoundException(ORDERS_MESSAGES.USER_NOT_FOUND);
    }

    const sessionInfo = await this.sessionInfoGateway.getSessionForOrder(
      this.extractSessionId(order),
    );
    if (!sessionInfo) {
      throw new NotFoundException(ORDERS_MESSAGES.SESSION_NOT_FOUND);
    }

    const minimumAge = await this.movieInfoGateway.getMinimumAge(
      sessionInfo.movieId,
    );
    if (minimumAge !== null && calculateAge(user.birthDate) < minimumAge) {
      throw new BadRequestException(ORDERS_MESSAGES.AGE_RESTRICTION);
    }

    const occupiedSeats = new Set(
      sessionInfo.seats.filter((s) => s.isOccupied).map((s) => s.seatNumber),
    );
    const taken = order.seats.filter((s) => occupiedSeats.has(s.seatNumber));

    if (taken.length > 0) {
      throw new BadRequestException(ORDERS_MESSAGES.SEATS_NO_LONGER_AVAILABLE);
    }
  }

  // Cobrança enviada ao gateway: o pedido sai do carrinho e deixa de
  // aceitar edição de produtos até o gateway responder.
  async markPaymentPending(orderId: string): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    order.status = OrderStatus.PAYMENT_PENDING;
    return order.save();
  }

  // Finalização da compra, disparada pela aprovação do pagamento: ocupa os
  // assentos, dá baixa no estoque e emite os ingressos — tudo em uma única
  // transação, para que uma falha em qualquer etapa não deixe o pedido pela
  // metade.
  async fulfillPaidOrder(
    orderId: string,
    ctx: AuditContext,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    // Idempotente: reentregas do gateway não podem emitir ingresso em
    // dobro nem baixar o estoque duas vezes.
    if (order.status === OrderStatus.PAYMENT_APPROVED) {
      return order;
    }

    const sessionId = this.extractSessionId(order);
    const sessionInfo =
      await this.sessionInfoGateway.getSessionForOrder(sessionId);
    if (!sessionInfo) {
      throw new NotFoundException(ORDERS_MESSAGES.SESSION_NOT_FOUND);
    }

    const mongooseSession = await this.connection.startSession();

    try {
      await mongooseSession.withTransaction(async () => {
        const seatNumbers = order.seats.map((s) => s.seatNumber);

        // Ocupação atômica: o filtro do documento exige que NENHUM dos
        // assentos do pedido esteja ocupado.
        const seatUpdate = await this.sessionModel.updateOne(
          {
            _id: sessionId,
            seats: {
              $not: {
                $elemMatch: {
                  seatNumber: { $in: seatNumbers },
                  isOccupied: true,
                },
              },
            },
          },
          { $set: { 'seats.$[elem].isOccupied': true } },
          {
            arrayFilters: [{ 'elem.seatNumber': { $in: seatNumbers } }],
            session: mongooseSession,
          },
        );

        if (seatUpdate.matchedCount === 0) {
          throw new ConflictException(
            ORDERS_MESSAGES.SEATS_NO_LONGER_AVAILABLE,
          );
        }

        for (const item of order.products) {
          await this.productsService.decrementStock(
            this.extractRefId(item.product),
            item.quantity,
            mongooseSession,
          );
        }

        // Cada assento vira um ingresso próprio, com número e QR Code únicos
        // — é o que permite validar um ingresso individualmente na
        // portaria, mesmo quando a compra tem vários assentos.
        const ticketsToCreate = order.seats.map((seatItem) => {
          const ticketNumber = this.ticketCodeService.generateTicketNumber();

          return {
            userId: order.user,
            sessionId: new Types.ObjectId(sessionId),
            orderId: order._id,
            ticketNumber,
            qrCode: this.ticketCodeService.buildQrPayload(ticketNumber),
            status: TicketStatus.VALID,
            seatNumber: seatItem.seatNumber,
            type: seatItem.type,
            // O valor do ingresso é o que foi efetivamente cobrado no
            // pedido.
            pricePaid: seatItem.pricePaid,
          };
        });

        const created = await this.ticketModel.insertMany(ticketsToCreate, {
          session: mongooseSession,
        });

        order.tickets = created.map((t) => t._id);
        order.status = OrderStatus.PAYMENT_APPROVED;
        order.paymentApproved = true;
        order.ticketGeneratedAt = new Date();
        await order.save({ session: mongooseSession });
      });

      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation: OrderAuditOperation.CHECKOUT,
        result: OrderAuditResult.SUCCESS,
        sessionId: ctx.sessionId,
      });

      // Ingresso em PDF e e-mail de confirmação.
      await this.deliverTicketAfterFulfillment(orderId);

      // Pontos e notificações também ficam fora da transação, e pelo mesmo
      // motivo: são consequências da compra aprovada, não parte dela.
      await this.awardLoyaltyPoints(order);
      await this.announceApprovedOrder(order, sessionId);

      return order;
    } catch (error) {
      await this.auditService.register({
        userId: ctx.userId,
        orderId,
        operation: OrderAuditOperation.CHECKOUT,
        result: OrderAuditResult.FAILURE,
        sessionId: ctx.sessionId,
      });
      throw error;
    } finally {
      await mongooseSession.endSession();
    }
  }

  /** Pagamento recusado — pelo administrador ou pelo gateway. */
  async markPaymentRefused(
    orderId: string,
    failureReason?: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    order.status = OrderStatus.PAYMENT_REFUSED;
    const saved = await order.save();

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.paymentRefused(orderId, failureReason),
    );

    await this.notificationsService.notifyAdmins(
      NOTIFICATION_CONTENT.adminPaymentRefused(orderId, failureReason),
    );

    return saved;
  }

  // PIX expirado: libera assentos/produtos reservados e marca o pedido
  // como expirado.
  async markOrderExpired(orderId: string): Promise<OrderDocument> {
    const order = await this.findById(orderId);
    order.status = OrderStatus.ORDER_EXPIRED;
    await this.releaseReservation(order);
    const saved = await order.save();

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.orderExpired(orderId),
    );

    return saved;
  }

  // Botão "Cancelar Compra": cancelamento do pedido ainda não pago
  // (diferente de `requestCancellation`, que trata cancelamento de um
  // pedido já confirmado/pago, sujeito a prazo e política da empresa).
  async cancelTemporaryOrder(
    orderId: string,
    userId: string,
    ctx: AuditContext,
  ): Promise<OrderDocument> {
    const order = await this.findOneOwnedByUser(
      orderId,
      userId,
      ctx,
      OrderAuditOperation.REQUEST_CANCELLATION,
    );

    // Pedido já pago não é "reserva temporária": cancelá-lo passa pelo
    // fluxo de cancelamento/reembolso, com prazo e política da empresa.
    if (!PAYABLE_STATUSES.includes(order.status)) {
      throw new BadRequestException(ORDERS_MESSAGES.CANCELLATION_NOT_ALLOWED);
    }

    order.status = OrderStatus.ORDER_CANCELLED;
    await this.releaseReservation(order);
    await order.save();

    await this.auditService.register({
      userId: ctx.userId,
      orderId,
      operation: OrderAuditOperation.REQUEST_CANCELLATION,
      result: OrderAuditResult.SUCCESS,
      sessionId: ctx.sessionId,
    });

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.orderCancelled(orderId),
    );

    return order;
  }

  /** Credita os pontos da compra aprovada. */
  private async awardLoyaltyPoints(order: OrderDocument): Promise<void> {
    try {
      const result = await this.loyaltyService.awardForOrder({
        userId: this.extractOwnerId(order),
        orderId: order._id.toString(),
        amountInCents: order.totalAmount,
      });

      if (result.points > 0) {
        await this.notificationsService.notifyUser(
          this.extractOwnerId(order),
          NOTIFICATION_CONTENT.pointsEarned(
            order._id.toString(),
            result.points,
            result.balance,
          ),
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao creditar pontos do pedido ${order._id.toString()}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Avisos da compra aprovada: o comprador soube que o pagamento passou e
   * que o ingresso está disponível; a operação, que houve uma venda — e que
   * a sessão lotou, quando o último assento foi vendido.
   */
  private async announceApprovedOrder(
    order: OrderDocument,
    sessionId: string,
  ): Promise<void> {
    const orderId = order._id.toString();
    const session = await this.sessionModel
      .findById(sessionId)
      .select('movieTitle seats')
      .exec();

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.paymentApproved(orderId, session?.movieTitle),
    );

    await this.notificationsService.notifyUser(
      this.extractOwnerId(order),
      NOTIFICATION_CONTENT.ticketAvailable(orderId, order.tickets?.length ?? 0),
    );

    await this.notificationsService.notifyAdmins(
      NOTIFICATION_CONTENT.newSale(
        orderId,
        order.totalAmount,
        order.seats?.length ?? 0,
      ),
    );

    const freeSeats =
      session?.seats?.filter((seat) => !seat.isOccupied).length ?? null;

    if (freeSeats === 0 && session) {
      await this.notificationsService.notifyAdmins(
        NOTIFICATION_CONTENT.sessionSoldOut(sessionId, session.movieTitle),
      );
    }

    await this.checkStockAlerts(order);
  }

  /** Alerta de estoque da bomboniere. */
  private async checkStockAlerts(order: OrderDocument): Promise<void> {
    for (const item of order.products ?? []) {
      try {
        const product = await this.productsService.findOne(
          this.extractRefId(item.product),
        );

        if (product.quantity <= 0) {
          await this.notificationsService.notifyAdmins(
            NOTIFICATION_CONTENT.stockOut(
              this.extractRefId(item.product),
              product.name,
            ),
          );
        } else if (product.quantity <= LOW_STOCK_THRESHOLD) {
          await this.notificationsService.notifyAdmins(
            NOTIFICATION_CONTENT.stockLow(
              this.extractRefId(item.product),
              product.name,
              product.quantity,
            ),
          );
        }
      } catch {
        // Produto removido do catálogo depois da compra: não há alerta a
        // emitir, e isso não é um erro da venda.
        continue;
      }
    }
  }

  // O resultado do envio já é gravado no pedido pelo OrderReceiptService;
  // aqui só garantimos que uma falha não escape e derrube a confirmação da
  // compra para o usuário.
  private async deliverTicketAfterFulfillment(orderId: string): Promise<void> {
    try {
      const result = await this.receiptService.deliver(orderId);

      if (!result.emailSent) {
        this.logger.warn(
          `Pedido ${orderId} finalizado, mas o e-mail de confirmação não foi enviado: ${result.emailError}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Falha ao gerar/entregar o ingresso do pedido ${orderId}: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      await this.orderModel.updateOne(
        { _id: orderId },
        {
          $set: {
            confirmationEmailError:
              error instanceof Error ? error.message : 'erro desconhecido',
          },
        },
      );
    }
  }

  /**
   * A devolução deste pedido já aconteceu? `reservationReleasedAt` responde
   * por tudo que passar por aqui de agora em diante.
   */
  private async hasReleasedReservation(order: OrderDocument): Promise<boolean> {
    if (order.reservationReleasedAt) {
      return true;
    }

    if (!order.tickets?.length) {
      return false;
    }

    const stillActive = await this.ticketModel.countDocuments({
      _id: { $in: order.tickets },
      status: { $ne: TicketStatus.CANCELLED },
    });

    return stillActive === 0;
  }

  /**
   * Devolve o que a compra havia reservado: assentos liberados na sessão,
   * estoque da bomboniere restituído e ingressos marcados como cancelados.
   */
  private async releaseReservation(order: OrderDocument): Promise<void> {
    if (!order.paymentApproved) {
      return;
    }

    if (await this.hasReleasedReservation(order)) {
      // Backfill dos pedidos antigos: a devolução já ocorreu, só faltava o
      // registro de quando — a partir daqui a checagem é direta.
      order.reservationReleasedAt ??= new Date();
      return;
    }

    const seatNumbers = order.seats.map((seat) => seat.seatNumber);

    if (seatNumbers.length > 0) {
      await this.sessionModel.updateOne(
        { _id: this.extractSessionId(order) },
        { $set: { 'seats.$[elem].isOccupied': false } },
        { arrayFilters: [{ 'elem.seatNumber': { $in: seatNumbers } }] },
      );
    }

    for (const item of order.products) {
      await this.productsService.restoreStock(
        this.extractRefId(item.product),
        item.quantity,
      );
    }

    if (order.tickets?.length > 0) {
      await this.ticketModel.updateMany(
        { _id: { $in: order.tickets } },
        { $set: { status: TicketStatus.CANCELLED } },
      );
    }

    order.reservationReleasedAt = new Date();
  }
}
