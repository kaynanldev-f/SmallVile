import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import { Payment, PaymentDocument } from '../schemas/payment.schema';
import {
  isPaymentMethodAvailable,
  PAYMENT_METHOD_LABEL,
  PaymentMethod,
} from '../enums/payment-method.enum';
import {
  FINAL_PAYMENT_STATUSES,
  PaymentStatus,
} from '../enums/payment-status.enum';
import { CreatePaymentDto } from '../dtos/create-payment.dto';
import { RejectPaymentDto } from '../dtos/reject-payment.dto';
import { PAYMENT_MESSAGE } from '../messages/payments.message';
import {
  MockPaymentGatewayService,
  MockChargeResult,
} from './mock-payment-gateway.service';
import { OrdersService } from 'src/orders/services/orders.service';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { NOTIFICATION_CONTENT } from 'src/notifications/messages/notification-content';

interface AuditContext {
  userId: string;
  sessionId: string;
}

export interface PaymentMethodOption {
  method: PaymentMethod;
  label: string;
  available: boolean;
  unavailableReason?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Regra: parcelamento em até 4x sem juros para compras acima de
  // R$ 100,00 (10000 centavos); acima de 4x, 1% de juros por parcela.
  private readonly INSTALLMENTS_MIN_AMOUNT_CENTS = 10_000;
  private readonly INTEREST_FREE_INSTALLMENTS = 4;
  private readonly INTEREST_RATE_PER_INSTALLMENT = 0.01;

  constructor(
    @InjectModel(Payment.name)
    private readonly paymentModel: Model<PaymentDocument>,
    private readonly gateway: MockPaymentGatewayService,
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Formas de pagamento e a disponibilidade de cada uma. */
  listPaymentMethods(): PaymentMethodOption[] {
    return Object.values(PaymentMethod).map((method) => {
      const available = isPaymentMethodAvailable(method);

      return {
        method,
        label: PAYMENT_METHOD_LABEL[method],
        available,
        ...(available
          ? {}
          : { unavailableReason: PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE }),
      };
    });
  }

  // Etapa 1: criação do pagamento — valida pedido/assentos/campos e
  // dispara a simulação de processamento do gateway mockado.
  async createPayment(
    userId: string,
    dto: CreatePaymentDto,
    ctx: AuditContext,
  ): Promise<PaymentDocument> {
    // Cartão de crédito/débito ainda não é processado: a opção existe na
    // interface como "em breve", mas nenhuma cobrança é criada por ela.
    this.assertMethodAvailable(dto.method);

    this.logger.log(
      `Iniciando criação de pagamento (usuário ${ctx.userId}, sessão ${ctx.sessionId})`,
    );

    const order = await this.ordersService.findById(dto.orderId);

    if (order.user.toString() !== userId) {
      throw new NotFoundException(PAYMENT_MESSAGE.ORDER_NOT_FOUND);
    }

    // "O sistema não deve permitir acesso a esta tela sem que o usuário
    // possua ao menos um ingresso ou produto da bomboniere"
    if (!this.ordersService.hasPurchasableItems(order)) {
      throw new BadRequestException(PAYMENT_MESSAGE.ORDER_EMPTY);
    }

    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    const existingByKey = await this.paymentModel.findOne({ idempotencyKey });
    if (existingByKey) {
      // Mesmo clique/retry: devolve o pagamento já existente em vez de
      // criar um novo (evita duplo processamento).
      return existingByKey;
    }

    const activeForOrder = await this.paymentModel.findOne({
      order: order._id,
      status: PaymentStatus.PENDING,
    });
    if (activeForOrder) {
      return activeForOrder;
    }

    const alreadyApproved = await this.paymentModel.findOne({
      order: order._id,
      status: PaymentStatus.APPROVED,
    });
    if (alreadyApproved) {
      throw new ConflictException(PAYMENT_MESSAGE.PAYMENT_ALREADY_PROCESSED);
    }

    // Revalidação antes de enviar ao gateway (PIX e cartão): status do
    // pedido, sessão, classificação indicativa e disponibilidade dos
    // assentos.
    await this.ordersService.validateBeforeCharge(order, userId);

    const { amount, installments, interestRate } = this.computeAmount(
      order.totalAmount,
      dto.method,
      dto.installments,
    );

    let chargeResult: MockChargeResult;
    try {
      chargeResult = this.gateway.createCharge(dto.method, amount);
    } catch {
      throw new ServiceUnavailableException(
        PAYMENT_MESSAGE.GATEWAY_COMMUNICATION_FAILURE,
      );
    }

    const payment = await this.paymentModel.create({
      order: order._id,
      user: new Types.ObjectId(userId),
      method: dto.method,
      status: PaymentStatus.PENDING,
      amount,
      installments,
      interestRate,
      cardLast4: dto.cardNumber?.slice(-4),
      pix: chargeResult.pix,
      gatewayReference: chargeResult.gatewayReference,
      idempotencyKey,
    });

    // Cobrança enviada: o pedido sai do carrinho e não aceita mais
    // edição de produtos enquanto o gateway não responder.
    await this.ordersService.markPaymentPending(order._id.toString());

    // Etapa 2: processamento.
    if (dto.method !== PaymentMethod.PIX) {
      this.gateway.simulateCardProcessing(async (status, reason) => {
        await this.resolveCardPayment(payment.id, status, reason, ctx);
      });
    }

    // Confirmação da compra para o usuário e chamado de análise para a
    // operação.
    const orderId = order._id.toString();

    await this.notificationsService.notifyUser(
      userId,
      NOTIFICATION_CONTENT.orderCreated(orderId, amount),
    );

    await this.notificationsService.notifyAdmins(
      NOTIFICATION_CONTENT.paymentAwaitingReview(orderId, amount),
    );

    return payment;
  }

  // Etapa 3: retorno do status (pendente, aprovado ou recusado). Também
  // resolve, de forma preguiçosa, a expiração de pagamentos PIX vencidos.
  async getStatus(paymentId: string, userId: string): Promise<PaymentDocument> {
    const payment = await this.findOwnedByUser(paymentId, userId);

    if (
      payment.method === PaymentMethod.PIX &&
      payment.status === PaymentStatus.PENDING &&
      payment.pix?.expiresAt &&
      payment.pix.expiresAt.getTime() <= Date.now()
    ) {
      return this.expirePixPayment(payment);
    }

    return payment;
  }

  /** Pagamento mais recente de um pedido. */
  async findLatestForOrder(
    orderId: string,
    requesterId: string,
    requesterRole?: UserRole,
  ): Promise<PaymentDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException(PAYMENT_MESSAGE.PAYMENT_NOT_FOUND);
    }

    const filter: Record<string, unknown> = {
      order: new Types.ObjectId(orderId),
    };

    // A regra de visibilidade fica no servidor: só o administrador consulta o
    // pagamento de um pedido que não é dele.
    if (requesterRole !== UserRole.ADMIN) {
      filter.user = new Types.ObjectId(requesterId);
    }

    const payment = await this.paymentModel.findOne(filter).sort({
      createdAt: -1,
    });

    if (!payment) {
      throw new NotFoundException(PAYMENT_MESSAGE.PAYMENT_NOT_FOUND);
    }

    return payment;
  }

  // Endpoint de simulação/desenvolvimento: representa o webhook que um
  // gateway real enviaria ao confirmar o pagamento PIX.
  async confirmPixPaymentMock(
    paymentId: string,
    userId: string,
    ctx: AuditContext,
  ): Promise<PaymentDocument> {
    const payment = await this.findOwnedByUser(paymentId, userId);

    if (payment.method !== PaymentMethod.PIX) {
      throw new BadRequestException(
        'Este pagamento não é um PIX e não pode ser confirmado por este endpoint.',
      );
    }

    if (FINAL_PAYMENT_STATUSES.includes(payment.status)) {
      throw new ConflictException(PAYMENT_MESSAGE.PAYMENT_ALREADY_PROCESSED);
    }

    if (
      payment.pix?.expiresAt &&
      payment.pix.expiresAt.getTime() <= Date.now()
    ) {
      return this.expirePixPayment(payment);
    }

    payment.status = this.gateway.confirmPixPayment();
    payment.processedAt = new Date();
    await payment.save();

    await this.fulfillApprovedPayment(payment, ctx);

    return payment;
  }

  /**
   * Aprova, pelo painel do administrador, o pagamento pendente de um pedido.
   */
  async approveOrderPaymentMock(
    orderId: string,
    ctx: AuditContext,
  ): Promise<PaymentDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException(PAYMENT_MESSAGE.ORDER_NOT_FOUND);
    }

    // O mais recente: uma tentativa recusada antes não deve ser reaberta.
    const payment = await this.paymentModel
      .findOne({
        order: new Types.ObjectId(orderId),
        status: PaymentStatus.PENDING,
      })
      .sort({ createdAt: -1 });

    if (!payment) {
      throw new NotFoundException(PAYMENT_MESSAGE.NO_PENDING_PAYMENT);
    }

    // Um PIX vencido não vira venda por decisão do admin: o assento já pode
    // ter voltado para o mapa.
    if (
      payment.pix?.expiresAt &&
      payment.pix.expiresAt.getTime() <= Date.now()
    ) {
      await this.expirePixPayment(payment);
      throw new ConflictException(PAYMENT_MESSAGE.PIX_EXPIRED);
    }

    payment.status = PaymentStatus.APPROVED;
    payment.processedAt = new Date();
    await payment.save();

    this.logger.warn(
      `Pagamento ${payment.id} do pedido ${orderId} aprovado manualmente pelo administrador ${ctx.userId} (gateway mockado)`,
    );

    await this.fulfillApprovedPayment(payment, ctx);

    return payment;
  }

  /**
   * Recusa, pelo painel do administrador, o pagamento pendente de um pedido.
   */
  async rejectOrderPayment(
    orderId: string,
    dto: RejectPaymentDto,
    ctx: AuditContext,
  ): Promise<PaymentDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new NotFoundException(PAYMENT_MESSAGE.ORDER_NOT_FOUND);
    }

    const payment = await this.paymentModel
      .findOne({ order: new Types.ObjectId(orderId) })
      .sort({ createdAt: -1 });

    if (!payment) {
      throw new NotFoundException(PAYMENT_MESSAGE.NO_PENDING_PAYMENT);
    }

    // Transição inválida: aprovado/recusado/expirado não voltam a ser
    // decididos pelo administrador.
    if (FINAL_PAYMENT_STATUSES.includes(payment.status)) {
      throw new ConflictException(PAYMENT_MESSAGE.PAYMENT_ALREADY_PROCESSED);
    }

    payment.status = PaymentStatus.REFUSED;
    payment.processedAt = new Date();
    payment.failureReason =
      dto.reason?.trim() || PAYMENT_MESSAGE.PAYMENT_REJECTION_DEFAULT_REASON;
    await payment.save();

    await this.ordersService.markPaymentRefused(orderId, payment.failureReason);

    this.logger.warn(
      `Pagamento ${payment.id} do pedido ${orderId} recusado pelo administrador ${ctx.userId}: ${payment.failureReason}`,
    );

    return payment;
  }

  // Botão "Cancelar Compra"
  async cancelPurchase(
    paymentOrOrderId: string,
    userId: string,
    ctx: AuditContext,
  ) {
    const order = await this.ordersService.cancelTemporaryOrder(
      paymentOrOrderId,
      userId,
      ctx,
    );

    await this.paymentModel.updateMany(
      { order: order._id, status: PaymentStatus.PENDING },
      { $set: { status: PaymentStatus.EXPIRED, processedAt: new Date() } },
    );

    return { message: PAYMENT_MESSAGE.PURCHASE_CANCELLED, order };
  }

  private assertMethodAvailable(method: PaymentMethod): void {
    if (!isPaymentMethodAvailable(method)) {
      throw new BadRequestException(PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE);
    }
  }

  private async findOwnedByUser(
    paymentId: string,
    userId: string,
  ): Promise<PaymentDocument> {
    if (!Types.ObjectId.isValid(paymentId)) {
      throw new NotFoundException(PAYMENT_MESSAGE.PAYMENT_NOT_FOUND);
    }
    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      user: new Types.ObjectId(userId),
    });
    if (!payment) {
      throw new NotFoundException(PAYMENT_MESSAGE.PAYMENT_NOT_FOUND);
    }
    return payment;
  }

  // Callback chamado pelo gateway mockado ao "concluir" o processamento
  // de um pagamento por cartão.
  private async resolveCardPayment(
    paymentId: string,
    status: PaymentStatus.APPROVED | PaymentStatus.REFUSED,
    reason: string | undefined,
    ctx: AuditContext,
  ): Promise<void> {
    const payment = await this.paymentModel.findById(paymentId);
    if (!payment || FINAL_PAYMENT_STATUSES.includes(payment.status)) {
      return; // já resolvido/cancelado — idempotente
    }

    payment.status = status;
    payment.processedAt = new Date();
    payment.failureReason = reason;
    await payment.save();

    if (status === PaymentStatus.APPROVED) {
      await this.fulfillApprovedPayment(payment, ctx);
    } else {
      await this.ordersService.markPaymentRefused(
        payment.order.toString(),
        reason,
      );
      this.logger.log(`Pagamento ${paymentId} recusado (simulação): ${reason}`);
    }
  }

  // Pagamento aprovado pelo gateway: finaliza a compra (assentos, estoque e
  // ingressos).
  private async fulfillApprovedPayment(
    payment: PaymentDocument,
    ctx: AuditContext,
  ): Promise<void> {
    const orderId = payment.order.toString();

    try {
      await this.ordersService.fulfillPaidOrder(orderId, ctx);
    } catch (error) {
      const failureReason =
        error instanceof Error
          ? error.message
          : PAYMENT_MESSAGE.PAYMENT_NOT_AUTHORIZED;

      payment.status = PaymentStatus.REFUSED;
      payment.failureReason = failureReason;
      await payment.save();

      await this.ordersService.markPaymentRefused(orderId, failureReason);

      this.logger.error(
        `Pagamento ${payment.id} aprovado, mas a finalização do pedido ${orderId} falhou: ${failureReason}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async expirePixPayment(
    payment: PaymentDocument,
  ): Promise<PaymentDocument> {
    payment.status = PaymentStatus.EXPIRED;
    payment.processedAt = new Date();
    await payment.save();
    await this.ordersService.markOrderExpired(payment.order.toString());
    return payment;
  }

  // Calcula o valor final considerando parcelamento com juros acima de 4x
  // (regra da tela: até 4x sem juros para compras > R$100; 1% de juros por
  // parcela acima disso).
  private computeAmount(
    baseAmountCents: number,
    method: PaymentMethod,
    requestedInstallments?: number,
  ): { amount: number; installments: number; interestRate: number } {
    if (method !== PaymentMethod.CREDIT_CARD) {
      return { amount: baseAmountCents, installments: 1, interestRate: 0 };
    }

    const installments =
      baseAmountCents > this.INSTALLMENTS_MIN_AMOUNT_CENTS
        ? (requestedInstallments ?? 1)
        : 1;

    if (installments <= this.INTEREST_FREE_INSTALLMENTS) {
      return { amount: baseAmountCents, installments, interestRate: 0 };
    }

    const interestRate = this.INTEREST_RATE_PER_INSTALLMENT * installments;
    const amount = Math.round(baseAmountCents * (1 + interestRate));

    return { amount, installments, interestRate };
  }
}
