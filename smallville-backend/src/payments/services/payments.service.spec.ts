import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { PaymentsService } from './payments.service';
import { MockPaymentGatewayService } from './mock-payment-gateway.service';
import { Payment } from '../schemas/payment.schema';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PAYMENT_MESSAGE } from '../messages/payments.message';
import { OrdersService } from 'src/orders/services/orders.service';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { UserRole } from 'src/users/enums/user-roles.enum';

describe('PaymentsService (Unitário)', () => {
  let service: PaymentsService;

  // Encadeamento das queries do mongoose: `sort` devolve o próprio mock e o
  // resultado sai de `exec()` — ou do `then`, para as chamadas aguardadas
  // direto, sem `.sort()` (caso do `findOne()` na criação do pagamento).
  interface QueryMock {
    exec: jest.Mock;
    sort: jest.Mock;
    then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
  }

  const mockExec = jest.fn();
  const queryMock: QueryMock = {
    exec: mockExec,
    sort: jest.fn((): QueryMock => queryMock),
    then: (resolve) => (mockExec() as Promise<unknown>).then(resolve),
  };

  const paymentModelMock = {
    findOne: jest.fn((): QueryMock => queryMock),
    findById: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
  };

  const gatewayMock = {
    createCharge: jest.fn(),
    simulateCardProcessing: jest.fn(),
    confirmPixPayment: jest.fn(),
  };

  const ordersServiceMock = {
    findById: jest.fn(),
    hasPurchasableItems: jest.fn(),
    validateBeforeCharge: jest.fn(),
    markPaymentPending: jest.fn(),
    markPaymentRefused: jest.fn(),
    markOrderExpired: jest.fn(),
    fulfillPaidOrder: jest.fn(),
    cancelTemporaryOrder: jest.fn(),
  };

  // As notificações são efeito colateral do pagamento: o service só precisa
  // saber que elas foram disparadas, não como são gravadas.
  const notificationsServiceMock = {
    notifyUser: jest.fn(),
    notifyAdmins: jest.fn(),
  };

  const userId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();
  const ctx = { userId, sessionId: 'sessao-hash' };

  const buildOrder = () => ({
    _id: new Types.ObjectId(orderId),
    user: new Types.ObjectId(userId),
    totalAmount: 3000,
    seats: [{ seatNumber: 'A10' }],
    products: [],
  });

  const buildPayment = (status: PaymentStatus) => ({
    id: new Types.ObjectId().toString(),
    order: new Types.ObjectId(orderId),
    status,
    failureReason: undefined as string | undefined,
    processedAt: undefined as Date | undefined,
    save: jest.fn().mockResolvedValue(undefined),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    gatewayMock.confirmPixPayment.mockReturnValue(PaymentStatus.APPROVED);
    ordersServiceMock.hasPurchasableItems.mockReturnValue(true);
    ordersServiceMock.validateBeforeCharge.mockResolvedValue(undefined);
    ordersServiceMock.markPaymentPending.mockResolvedValue(undefined);
    ordersServiceMock.markPaymentRefused.mockResolvedValue(undefined);
    ordersServiceMock.fulfillPaidOrder.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: getModelToken(Payment.name), useValue: paymentModelMock },
        { provide: MockPaymentGatewayService, useValue: gatewayMock },
        { provide: OrdersService, useValue: ordersServiceMock },
        {
          provide: NotificationsService,
          useValue: notificationsServiceMock,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('listPaymentMethods', () => {
    it('marca o PIX como disponível e o cartão como "em breve"', () => {
      const methods = service.listPaymentMethods();

      const pix = methods.find((m) => m.method === PaymentMethod.PIX);
      const credit = methods.find(
        (m) => m.method === PaymentMethod.CREDIT_CARD,
      );
      const debit = methods.find((m) => m.method === PaymentMethod.DEBIT_CARD);

      // O cartão continua listado — é a indicação de funcionalidade futura —
      // mas nunca como disponível.
      expect(methods).toHaveLength(3);
      expect(pix?.available).toBe(true);
      expect(pix?.unavailableReason).toBeUndefined();
      expect(credit?.available).toBe(false);
      expect(credit?.unavailableReason).toBe(
        PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE,
      );
      expect(debit?.available).toBe(false);
      expect(debit?.unavailableReason).toBe(
        PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE,
      );
    });
  });

  describe('createPayment', () => {
    it('cria o pagamento PIX pendente com o QR Code do gateway', async () => {
      const expiresAt = new Date(Date.now() + 15 * 60_000);
      ordersServiceMock.findById.mockResolvedValue(buildOrder());
      mockExec
        .mockResolvedValueOnce(null) // idempotencyKey
        .mockResolvedValueOnce(null) // pagamento pendente do pedido
        .mockResolvedValueOnce(null); // pagamento já aprovado
      gatewayMock.createCharge.mockReturnValue({
        gatewayReference: 'MOCK-1',
        pix: { qrCode: 'qr', copyPasteCode: 'copia-e-cola', expiresAt },
      });
      paymentModelMock.create.mockResolvedValue({
        id: 'pagamento-1',
        status: PaymentStatus.PENDING,
      });

      const payment = await service.createPayment(
        userId,
        { orderId, method: PaymentMethod.PIX },
        ctx,
      );

      expect(payment.status).toBe(PaymentStatus.PENDING);
      expect(gatewayMock.createCharge).toHaveBeenCalledWith(
        PaymentMethod.PIX,
        3000,
      );
      expect(ordersServiceMock.markPaymentPending).toHaveBeenCalledWith(
        orderId,
      );
      // PIX não passa pelo processamento simulado de cartão.
      expect(gatewayMock.simulateCardProcessing).not.toHaveBeenCalled();
    });

    it.each([
      ['cartão de crédito', PaymentMethod.CREDIT_CARD],
      ['cartão de débito', PaymentMethod.DEBIT_CARD],
    ])(
      'recusa iniciar pagamento por %s enquanto a forma não está implementada',
      async (_label, method) => {
        await expect(
          service.createPayment(userId, { orderId, method }, ctx),
        ).rejects.toThrow(
          new BadRequestException(PAYMENT_MESSAGE.PAYMENT_METHOD_UNAVAILABLE),
        );

        // Nenhuma cobrança, nenhum pagamento e nenhuma aprovação simulada: o
        // fluxo de cartão não existe pela metade.
        expect(gatewayMock.createCharge).not.toHaveBeenCalled();
        expect(paymentModelMock.create).not.toHaveBeenCalled();
        expect(gatewayMock.simulateCardProcessing).not.toHaveBeenCalled();
        expect(ordersServiceMock.markPaymentPending).not.toHaveBeenCalled();
      },
    );
  });

  describe('approveOrderPaymentMock', () => {
    it('aprova o pagamento pendente e finaliza o pedido', async () => {
      const payment = buildPayment(PaymentStatus.PENDING);
      mockExec.mockResolvedValueOnce(payment);

      const result = await service.approveOrderPaymentMock(orderId, ctx);

      expect(result.status).toBe(PaymentStatus.APPROVED);
      expect(payment.save).toHaveBeenCalled();
      expect(ordersServiceMock.fulfillPaidOrder).toHaveBeenCalledWith(
        orderId,
        ctx,
      );
    });
  });

  describe('rejectOrderPayment', () => {
    it('recusa o pagamento pendente com o motivo informado pelo administrador', async () => {
      const payment = buildPayment(PaymentStatus.PENDING);
      mockExec.mockResolvedValueOnce(payment);

      const result = await service.rejectOrderPayment(
        orderId,
        { reason: 'Pagamento não identificado' },
        ctx,
      );

      expect(result.status).toBe(PaymentStatus.REFUSED);
      expect(result.failureReason).toBe('Pagamento não identificado');
      expect(result.processedAt).toBeInstanceOf(Date);
      expect(payment.save).toHaveBeenCalled();
      // O motivo acompanha a transição: é ele que o usuário vê no pedido e
      // na notificação de recusa.
      expect(ordersServiceMock.markPaymentRefused).toHaveBeenCalledWith(
        orderId,
        'Pagamento não identificado',
      );
      // Recusado não é aprovado: nada de finalizar o pedido nem emitir
      // ingresso.
      expect(ordersServiceMock.fulfillPaidOrder).not.toHaveBeenCalled();
    });

    it('grava o motivo padrão quando o administrador não informa nenhum', async () => {
      const payment = buildPayment(PaymentStatus.PENDING);
      mockExec.mockResolvedValueOnce(payment);

      const result = await service.rejectOrderPayment(orderId, {}, ctx);

      expect(result.status).toBe(PaymentStatus.REFUSED);
      expect(result.failureReason).toBe(
        PAYMENT_MESSAGE.PAYMENT_REJECTION_DEFAULT_REASON,
      );
    });

    it('não recusa um pagamento já aprovado', async () => {
      const payment = buildPayment(PaymentStatus.APPROVED);
      mockExec.mockResolvedValueOnce(payment);

      await expect(
        service.rejectOrderPayment(orderId, {}, ctx),
      ).rejects.toThrow(ConflictException);

      expect(payment.status).toBe(PaymentStatus.APPROVED);
      expect(payment.save).not.toHaveBeenCalled();
      expect(ordersServiceMock.markPaymentRefused).not.toHaveBeenCalled();
    });

    it('não recusa duas vezes o mesmo pagamento', async () => {
      const payment = buildPayment(PaymentStatus.REFUSED);
      mockExec.mockResolvedValueOnce(payment);

      await expect(
        service.rejectOrderPayment(orderId, {}, ctx),
      ).rejects.toThrow(ConflictException);

      expect(payment.save).not.toHaveBeenCalled();
    });

    it('responde não encontrado quando o pedido não tem pagamento', async () => {
      mockExec.mockResolvedValueOnce(null);

      await expect(
        service.rejectOrderPayment(orderId, {}, ctx),
      ).rejects.toThrow(
        new NotFoundException(PAYMENT_MESSAGE.NO_PENDING_PAYMENT),
      );
    });
  });

  describe('findLatestForOrder', () => {
    it('trava a consulta do usuário comum nos próprios pagamentos', async () => {
      const payment = buildPayment(PaymentStatus.REFUSED);
      payment.failureReason = 'Pagamento não identificado';
      mockExec.mockResolvedValueOnce(payment);

      const result = await service.findLatestForOrder(orderId, userId);

      expect(result.status).toBe(PaymentStatus.REFUSED);
      expect(result.failureReason).toBe('Pagamento não identificado');
      expect(paymentModelMock.findOne).toHaveBeenCalledWith({
        order: new Types.ObjectId(orderId),
        user: new Types.ObjectId(userId),
      });
    });

    it('permite ao administrador consultar o pagamento de qualquer pedido', async () => {
      mockExec.mockResolvedValueOnce(buildPayment(PaymentStatus.PENDING));

      await service.findLatestForOrder(orderId, userId, UserRole.ADMIN);

      expect(paymentModelMock.findOne).toHaveBeenCalledWith({
        order: new Types.ObjectId(orderId),
      });
    });

    it('responde não encontrado quando não existe pagamento para o pedido', async () => {
      mockExec.mockResolvedValueOnce(null);

      await expect(service.findLatestForOrder(orderId, userId)).rejects.toThrow(
        new NotFoundException(PAYMENT_MESSAGE.PAYMENT_NOT_FOUND),
      );
    });
  });
});
