import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OrdersService } from './orders.service';
import { OrdersAuditService } from './orders-audit.service';
import { OrderReceiptService } from './order-receipt.service';
import { NotificationsService } from 'src/notifications/services/notifications.service';
import { LoyaltyService } from 'src/loyalty/services/loyalty.service';
import { TicketPricingService } from 'src/sales-control/services/ticket-pricing.service';
import { Order } from '../schemas/order.schema';
import { Ticket } from 'src/tickets/schema/ticket.schema';
import { User } from 'src/users/schemas/users.schema';
import { Session } from 'src/session/schemas/session.schema';
import { ProductsService } from 'src/products/service/products.service';
import { TicketCodeService } from 'src/tickets/service/ticket-code.service';
import { SESSION_INFO_GATEWAY } from './session-info.gateway';
import { MOVIE_INFO_GATEWAY } from './movie-info.gateway';
import {
  OrderAuditOperation,
  OrderAuditResult,
} from '../enums/order-audit-operation.enum';
import { OrderStatus } from '../enums/order-status.enum';
import { UserRole } from 'src/users/enums/user-roles.enum';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';
import { TicketStatus } from 'src/tickets/enums/ticket-status.enum';

describe('OrdersService (Unitário)', () => {
  let service: OrdersService;

  // Encadeamento das queries do mongoose: cada método devolve o próprio
  // mock, e o resultado sai de `exec()` — ou do `then`, para as chamadas
  // aguardadas direto, sem `.exec()` (caso de `findById().populate()`).
  interface QueryMock {
    exec: jest.Mock;
    populate: jest.Mock;
    sort: jest.Mock;
    skip: jest.Mock;
    limit: jest.Mock;
    then: (resolve: (value: unknown) => unknown) => Promise<unknown>;
  }

  const mockExec = jest.fn();
  const queryMock: QueryMock = {
    exec: mockExec,
    populate: jest.fn((): QueryMock => queryMock),
    sort: jest.fn((): QueryMock => queryMock),
    skip: jest.fn((): QueryMock => queryMock),
    limit: jest.fn((): QueryMock => queryMock),
    then: (resolve) => (mockExec() as Promise<unknown>).then(resolve),
  };

  type Filter = Record<string, unknown>;

  // O model é construtor (`new this.orderModel(...)` na criação do pedido) e
  // também carrega os métodos estáticos usados nas consultas.
  const createdOrders: (Filter & { save: jest.Mock })[] = [];

  const orderModelMock = Object.assign(
    jest.fn().mockImplementation((doc: Filter) => {
      const created = {
        ...doc,
        _id: new Types.ObjectId(),
        save: jest.fn().mockResolvedValue(undefined),
      };
      createdOrders.push(created);
      return created;
    }),
    {
      find: jest.fn((filter?: Filter): QueryMock => {
        void filter;
        return queryMock;
      }),
      findOne: jest.fn((): QueryMock => queryMock),
      findById: jest.fn((): QueryMock => queryMock),
      countDocuments: jest.fn((): QueryMock => queryMock),
      updateOne: jest.fn((filter?: Filter, update?: { $set: Filter }) => {
        void filter;
        void update;
        return queryMock;
      }),
    },
  );

  const ticketModelMock = {
    insertMany: jest.fn((docs?: Filter[]) => {
      void docs;
      return Promise.resolve([] as unknown[]);
    }),
    updateMany: jest.fn(),
    // Usado pela checagem de devolução já feita: quantos ingressos do pedido
    // ainda NÃO estão cancelados.
    countDocuments: jest.fn().mockResolvedValue(1),
  };
  const sessionModelMock = {
    updateOne: jest.fn(),
    // Usado ao anunciar a compra aprovada (título do filme e ocupação da
    // sessão, para o aviso de sessão lotada).
    findById: jest.fn(() => ({
      select: jest.fn(() => ({
        exec: jest.fn().mockResolvedValue({
          movieTitle: 'Interestelar',
          seats: [{ seatNumber: 'A1', isOccupied: true }],
        }),
      })),
    })),
  };

  // `withTransaction` apenas executa o callback: o comportamento
  // transacional em si é do MongoDB, não da regra que estamos testando.
  const connectionMock = {
    startSession: jest.fn().mockResolvedValue({
      withTransaction: (fn: () => Promise<unknown>) => fn(),
      endSession: jest.fn().mockResolvedValue(undefined),
    }),
  };

  const auditServiceMock = { register: jest.fn().mockResolvedValue(undefined) };
  const productsServiceMock = {
    decrementStock: jest.fn(),
    restoreStock: jest.fn(),
  };
  const sessionInfoGatewayMock = {
    getSessionForOrder: jest.fn(),
    getSessionStartDate: jest.fn(),
  };
  const ticketCodeServiceMock = {
    generateTicketNumber: jest.fn(() => 'SMV-20260818-TICKET01'),
    buildQrPayload: jest.fn(
      (ticketNumber: string) => `${ticketNumber}.ASSINADO`,
    ),
  };
  const receiptServiceMock = {
    buildPdfData: jest.fn(),
    generatePdf: jest.fn(),
    deliver: jest.fn(),
  };

  // O conteúdo da notificação é inspecionado em alguns testes, então o mock
  // é tipado: sem isso `mock.calls` chega como `any`.
  interface NotifyInputMock {
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }

  const notificationsServiceMock = {
    notifyUser: jest.fn((userId: string, input: NotifyInputMock) => {
      void userId;
      void input;
    }),
    notifyAdmins: jest.fn((input: NotifyInputMock) => {
      void input;
    }),
  };

  const loyaltyServiceMock = {
    awardForOrder: jest.fn().mockResolvedValue({
      points: 0,
      balance: 0,
      alreadyAwarded: false,
    }),
    revokeForOrder: jest.fn().mockResolvedValue({
      points: 0,
      balance: 0,
      alreadyRevoked: false,
    }),
  };

  // O nome do comprador entra no aviso que a operação recebe quando uma
  // solicitação de reembolso é aberta.
  const userModelMock = {
    findById: jest.fn(() => ({
      select: jest.fn(() => ({
        lean: jest.fn(() => ({
          exec: jest
            .fn()
            .mockResolvedValue({ name: 'Ana', surname: 'Ribeiro' }),
        })),
      })),
    })),
  };

  // Preço vem do controle de vendas: nos testes, inteira R$ 30 e meia R$ 15.
  const pricingServiceMock = {
    findSessionOrFail: jest.fn(),
    assertOnSale: jest.fn(),
    resolveForSession: jest.fn().mockResolvedValue({
      fullPrice: 3000,
      halfPrice: 1500,
      source: 'padrao',
    }),
    priceFor: jest.fn(
      (pricing: { fullPrice: number; halfPrice: number }, type: string) =>
        type === 'MEIA' ? pricing.halfPrice : pricing.fullPrice,
    ),
  };

  const ownerId = new Types.ObjectId().toString();
  const otherUserId = new Types.ObjectId().toString();
  const orderId = new Types.ObjectId().toString();

  const orderOfOwner = {
    _id: new Types.ObjectId(orderId),
    user: new Types.ObjectId(ownerId),
    status: 'pagamento_aprovado',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: getModelToken(Ticket.name), useValue: ticketModelMock },
        { provide: getModelToken(User.name), useValue: userModelMock },
        { provide: getModelToken(Session.name), useValue: sessionModelMock },
        { provide: getConnectionToken(), useValue: connectionMock },
        { provide: OrdersAuditService, useValue: auditServiceMock },
        { provide: ProductsService, useValue: productsServiceMock },
        { provide: SESSION_INFO_GATEWAY, useValue: sessionInfoGatewayMock },
        { provide: MOVIE_INFO_GATEWAY, useValue: {} },
        { provide: TicketCodeService, useValue: ticketCodeServiceMock },
        { provide: OrderReceiptService, useValue: receiptServiceMock },
        {
          provide: NotificationsService,
          useValue: notificationsServiceMock,
        },
        { provide: LoyaltyService, useValue: loyaltyServiceMock },
        { provide: TicketPricingService, useValue: pricingServiceMock },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    createdOrders.length = 0;
  });

  describe('findAll (regra de visibilidade)', () => {
    beforeEach(() => {
      mockExec.mockResolvedValue([]);
    });

    it('deve restringir o usuário comum aos próprios pedidos', async () => {
      await service.findAll(
        {},
        { userId: ownerId, sessionId: 'sess', role: UserRole.USER },
      );

      expect(orderModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ user: new Types.ObjectId(ownerId) }),
      );
    });

    it('deve devolver todos os pedidos para o administrador', async () => {
      await service.findAll(
        {},
        { userId: ownerId, sessionId: 'sess', role: UserRole.ADMIN },
      );

      // Sem filtro por usuário: o administrador enxerga o sistema inteiro.
      const filter = orderModelMock.find.mock.calls[0][0];
      expect(filter).not.toHaveProperty('user');
    });

    it('deve ignorar o filtro por usuário enviado por um usuário comum', async () => {
      await service.findAll(
        { userId: otherUserId },
        { userId: ownerId, sessionId: 'sess', role: UserRole.USER },
      );

      expect(orderModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ user: new Types.ObjectId(ownerId) }),
      );
    });

    it('deve tratar a ausência de papel no contexto como usuário comum', async () => {
      await service.findAll({}, { userId: ownerId, sessionId: 'sess' });

      expect(orderModelMock.find).toHaveBeenCalledWith(
        expect.objectContaining({ user: new Types.ObjectId(ownerId) }),
      );
    });
  });

  describe('findOneForRequester (regra de acesso)', () => {
    it('deve devolver o pedido para o próprio dono', async () => {
      mockExec.mockResolvedValueOnce(orderOfOwner);

      const result = await service.findOneForRequester(orderId, {
        userId: ownerId,
        sessionId: 'sess',
        role: UserRole.USER,
      });

      expect(result).toBe(orderOfOwner);
    });

    it('deve negar com 403 o acesso ao pedido de outro usuário', async () => {
      mockExec.mockResolvedValueOnce(orderOfOwner);

      await expect(
        service.findOneForRequester(orderId, {
          userId: otherUserId,
          sessionId: 'sess',
          role: UserRole.USER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve registrar na auditoria a tentativa de acesso a pedido alheio', async () => {
      mockExec.mockResolvedValueOnce(orderOfOwner);

      await expect(
        service.findOneForRequester(orderId, {
          userId: otherUserId,
          sessionId: 'sess',
          role: UserRole.USER,
        }),
      ).rejects.toThrow(ForbiddenException);

      expect(auditServiceMock.register).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: otherUserId,
          result: OrderAuditResult.DENIED,
        }),
      );
    });

    it('deve permitir que o administrador acesse o pedido de qualquer usuário', async () => {
      mockExec.mockResolvedValueOnce(orderOfOwner);

      const result = await service.findOneForRequester(orderId, {
        userId: otherUserId,
        sessionId: 'sess',
        role: UserRole.ADMIN,
      });

      expect(result).toBe(orderOfOwner);
    });

    it('deve responder 404 quando o pedido não existe', async () => {
      mockExec.mockResolvedValueOnce(null);

      await expect(
        service.findOneForRequester(orderId, {
          userId: ownerId,
          sessionId: 'sess',
          role: UserRole.USER,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('fulfillPaidOrder (finalização da compra)', () => {
    const sessionId = new Types.ObjectId();
    const productId = new Types.ObjectId();
    const createdTicketIds = [new Types.ObjectId(), new Types.ObjectId()];

    let paidOrder: Record<string, unknown> & { save: jest.Mock };

    beforeEach(() => {
      paidOrder = {
        _id: new Types.ObjectId(orderId),
        user: new Types.ObjectId(ownerId),
        session: sessionId,
        status: OrderStatus.PAYMENT_PENDING,
        seats: [
          { seatNumber: 'A10', type: TicketType.FULL, pricePaid: 3000 },
          { seatNumber: 'A11', type: TicketType.HALF, pricePaid: 1500 },
        ],
        products: [{ product: productId, quantity: 2, pricePaid: 1600 }],
        tickets: [],
        save: jest.fn().mockResolvedValue(undefined),
      };

      mockExec.mockResolvedValue(paidOrder);

      sessionInfoGatewayMock.getSessionForOrder.mockResolvedValue({
        price: 3000,
        movieId: new Types.ObjectId().toString(),
        seats: [
          { seatNumber: 'A10', isOccupied: false },
          { seatNumber: 'A11', isOccupied: false },
        ],
      });

      sessionModelMock.updateOne.mockResolvedValue({ matchedCount: 1 });
      ticketModelMock.insertMany.mockResolvedValue(
        createdTicketIds.map((id) => ({ _id: id })),
      );
      productsServiceMock.decrementStock.mockResolvedValue(undefined);
      receiptServiceMock.deliver.mockResolvedValue({ emailSent: true });
    });

    it('deve emitir um ingresso por assento, com número e QR Code únicos', async () => {
      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      const emitted = ticketModelMock.insertMany.mock.calls[0][0];

      expect(emitted).toHaveLength(2);
      expect(emitted[0]).toMatchObject({
        seatNumber: 'A10',
        ticketNumber: 'SMV-20260818-TICKET01',
        qrCode: 'SMV-20260818-TICKET01.ASSINADO',
        status: TicketStatus.VALID,
        orderId: paidOrder._id,
      });
      expect(emitted[1].seatNumber).toBe('A11');
    });

    it('deve dar baixa no estoque dos produtos da bomboniere', async () => {
      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      expect(productsServiceMock.decrementStock).toHaveBeenCalledWith(
        productId.toString(),
        2,
        expect.anything(),
      );
    });

    it('deve associar os ingressos ao pedido e marcar o pagamento aprovado', async () => {
      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      expect(paidOrder.tickets).toEqual(createdTicketIds);
      expect(paidOrder.status).toBe(OrderStatus.PAYMENT_APPROVED);
      expect(paidOrder.paymentApproved).toBe(true);
      expect(paidOrder.ticketGeneratedAt).toBeInstanceOf(Date);
    });

    it('deve gerar o PDF e disparar o e-mail depois de finalizar a compra', async () => {
      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      expect(receiptServiceMock.deliver).toHaveBeenCalledWith(orderId);
    });

    it('não deve invalidar a compra quando a entrega do ingresso falha', async () => {
      receiptServiceMock.deliver.mockRejectedValueOnce(
        new Error('SMTP fora do ar'),
      );

      await expect(
        service.fulfillPaidOrder(orderId, {
          userId: ownerId,
          sessionId: 'sess',
        }),
      ).resolves.toBeDefined();

      // O pagamento já foi aprovado: a falha vira registro no pedido, não erro.
      expect(paidOrder.status).toBe(OrderStatus.PAYMENT_APPROVED);

      const [filter, update] = orderModelMock.updateOne.mock.calls[0];
      expect(filter).toEqual({ _id: orderId });
      expect(update.$set).toMatchObject({
        confirmationEmailError: 'SMTP fora do ar',
      });
    });

    it('deve ser idempotente para reentregas do gateway', async () => {
      paidOrder.status = OrderStatus.PAYMENT_APPROVED;

      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      expect(ticketModelMock.insertMany).not.toHaveBeenCalled();
      expect(receiptServiceMock.deliver).not.toHaveBeenCalled();
    });

    it('credita os pontos da compra aprovada', async () => {
      paidOrder.totalAmount = 5000;
      loyaltyServiceMock.awardForOrder.mockResolvedValueOnce({
        points: 100,
        balance: 100,
        alreadyAwarded: false,
      });

      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      expect(loyaltyServiceMock.awardForOrder).toHaveBeenCalledWith({
        userId: ownerId,
        orderId,
        amountInCents: 5000,
      });
    });

    it('avisa o comprador e a operação quando a compra é aprovada', async () => {
      await service.fulfillPaidOrder(orderId, {
        userId: ownerId,
        sessionId: 'sess',
      });

      const userTypes = notificationsServiceMock.notifyUser.mock.calls.map(
        (call: [string, { type: string }]) => call[1].type,
      );

      expect(userTypes).toEqual(
        expect.arrayContaining(['pagamento_aprovado', 'ingresso_disponivel']),
      );
      expect(notificationsServiceMock.notifyAdmins).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'nova_venda' }),
      );
    });

    it('não credita pontos quando a compra nem chega a ser finalizada', async () => {
      sessionModelMock.updateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(
        service.fulfillPaidOrder(orderId, {
          userId: ownerId,
          sessionId: 'sess',
        }),
      ).rejects.toThrow(ConflictException);

      expect(loyaltyServiceMock.awardForOrder).not.toHaveBeenCalled();
    });

    it('deve abortar quando um assento foi ocupado por outra compra', async () => {
      sessionModelMock.updateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await expect(
        service.fulfillPaidOrder(orderId, {
          userId: ownerId,
          sessionId: 'sess',
        }),
      ).rejects.toThrow(ConflictException);

      expect(receiptServiceMock.deliver).not.toHaveBeenCalled();
    });
  });

  describe('create (controle de venda e preço)', () => {
    const sessionId = new Types.ObjectId().toString();

    beforeEach(() => {
      sessionInfoGatewayMock.getSessionForOrder.mockResolvedValue({
        price: 3000,
        movieId: new Types.ObjectId().toString(),
        seats: [
          { seatNumber: 'A10', isOccupied: false },
          { seatNumber: 'A11', isOccupied: false },
        ],
      });

      pricingServiceMock.findSessionOrFail.mockResolvedValue({
        _id: new Types.ObjectId(sessionId),
        dateTime: '2026-08-21T21:00:00-03:00',
        price: 3000,
      });
      pricingServiceMock.assertOnSale.mockImplementation(() => undefined);
    });

    it('recusa o pedido quando a venda da sessão está encerrada', async () => {
      pricingServiceMock.assertOnSale.mockImplementation(() => {
        throw new BadRequestException(
          'As vendas para esta sessão estão encerradas.',
        );
      });

      await expect(
        service.create(
          {
            sessionId,
            seats: [{ seatNumber: 'A10', type: TicketType.FULL }],
          },
          ownerId,
          { userId: ownerId, sessionId: 'sess' },
        ),
      ).rejects.toThrow(BadRequestException);

      // Nada é gravado: a regra barra antes de criar o pedido.
      expect(createdOrders).toHaveLength(0);
    });

    it('cobra inteira e meia pelos valores configurados pelo administrador', async () => {
      pricingServiceMock.resolveForSession.mockResolvedValueOnce({
        fullPrice: 4000,
        halfPrice: 2000,
        source: 'regra',
      });

      await service.create(
        {
          sessionId,
          seats: [
            { seatNumber: 'A10', type: TicketType.FULL },
            { seatNumber: 'A11', type: TicketType.HALF },
          ],
        },
        ownerId,
        { userId: ownerId, sessionId: 'sess' },
      );

      const [created] = createdOrders;
      expect(created.seats).toEqual([
        { seatNumber: 'A10', type: TicketType.FULL, pricePaid: 4000 },
        { seatNumber: 'A11', type: TicketType.HALF, pricePaid: 2000 },
      ]);
      expect(created.totalAmount).toBe(6000);
    });
  });

  describe('markPaymentRefused (recusa do pagamento)', () => {
    it('avisa o comprador com o motivo e não credita pontos', async () => {
      const refusedOrder = {
        _id: new Types.ObjectId(orderId),
        user: new Types.ObjectId(ownerId),
        status: OrderStatus.PAYMENT_PENDING,
        save: jest.fn().mockResolvedValue(undefined),
      };
      mockExec.mockResolvedValueOnce(refusedOrder);

      await service.markPaymentRefused(orderId, 'Pagamento não identificado');

      expect(refusedOrder.status).toBe(OrderStatus.PAYMENT_REFUSED);
      expect(notificationsServiceMock.notifyUser).toHaveBeenCalledWith(
        ownerId,
        expect.objectContaining({
          type: 'pagamento_recusado',
          message: expect.stringContaining(
            'Pagamento não identificado',
          ) as string,
        }),
      );
      expect(loyaltyServiceMock.awardForOrder).not.toHaveBeenCalled();
    });
  });

  describe('findOneOwnedByUser (operações que alteram o pedido)', () => {
    it('deve negar com 403 mesmo para o administrador quando o pedido é de outro usuário', async () => {
      mockExec.mockResolvedValueOnce(orderOfOwner);

      // Visualizar pedido alheio é permitido ao administrador; agir sobre ele
      // (cancelar, reembolsar, editar produtos) não é.
      await expect(
        service.findOneOwnedByUser(orderId, otherUserId, {
          userId: otherUserId,
          sessionId: 'sess',
          role: UserRole.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve devolver o pedido para o próprio dono', async () => {
      mockExec.mockResolvedValueOnce(orderOfOwner);

      const result = await service.findOneOwnedByUser(orderId, ownerId, {
        userId: ownerId,
        sessionId: 'sess',
        role: UserRole.USER,
      });

      expect(result).toBe(orderOfOwner);
    });
  });

  describe('reembolso', () => {
    const adminId = new Types.ObjectId().toString();
    const productId = new Types.ObjectId();
    const ticketId = new Types.ObjectId();

    const userCtx = {
      userId: ownerId,
      sessionId: 'sess',
      role: UserRole.USER,
    };
    const adminCtx = {
      userId: adminId,
      sessionId: 'sess-admin',
      role: UserRole.ADMIN,
    };

    interface RefundState {
      requestedAt?: Date;
      requestedBy?: Types.ObjectId;
      reason?: string;
      amount?: number;
      previousStatus?: OrderStatus;
      resolvedAt?: Date;
      resolvedBy?: Types.ObjectId;
      resolutionReason?: string;
    }

    interface OrderState {
      _id: Types.ObjectId;
      user: Types.ObjectId;
      session: Types.ObjectId;
      status: OrderStatus;
      paymentApproved: boolean;
      totalAmount: number;
      seats: { seatNumber: string }[];
      products: { product: Types.ObjectId; quantity: number }[];
      tickets: Types.ObjectId[];
      reservationReleasedAt?: Date;
      refund?: RefundState;
      save: jest.Mock;
    }

    const buildOrder = (overrides: Partial<OrderState> = {}): OrderState => ({
      _id: new Types.ObjectId(orderId),
      user: new Types.ObjectId(ownerId),
      session: new Types.ObjectId(),
      status: OrderStatus.PAYMENT_APPROVED,
      paymentApproved: true,
      totalAmount: 6000,
      seats: [{ seatNumber: 'A1' }],
      products: [{ product: productId, quantity: 2 }],
      tickets: [ticketId],
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    describe('requestRefund (solicitação do comprador)', () => {
      it('abre a solicitação congelando valor e status anterior', async () => {
        const order = buildOrder();
        mockExec.mockResolvedValueOnce(order);

        const result = await service.requestRefund(
          orderId,
          ownerId,
          { reason: 'Não vou conseguir ir' },
          userCtx,
        );

        expect(order.status).toBe(OrderStatus.REFUND_REQUESTED);
        expect(order.refund).toEqual(
          expect.objectContaining({
            requestedBy: new Types.ObjectId(ownerId),
            reason: 'Não vou conseguir ir',
            // O valor é o do pedido, não um número enviado pelo cliente.
            amount: 6000,
            // Guardado antes da troca de status: diz se ainda há assento,
            // estoque e ingresso a devolver na aprovação.
            previousStatus: OrderStatus.PAYMENT_APPROVED,
          }),
        );
        expect(order.refund?.requestedAt).toBeInstanceOf(Date);
        expect(order.save).toHaveBeenCalled();
        expect(result.order).toBe(order);

        // Nada é devolvido na solicitação: o ingresso continua valendo
        // enquanto o administrador não decide.
        expect(productsServiceMock.restoreStock).not.toHaveBeenCalled();
        expect(ticketModelMock.updateMany).not.toHaveBeenCalled();
      });

      it('avisa o comprador e coloca a solicitação na fila do administrador', async () => {
        mockExec.mockResolvedValueOnce(buildOrder());

        await service.requestRefund(orderId, ownerId, {}, userCtx);

        expect(notificationsServiceMock.notifyUser).toHaveBeenCalledWith(
          ownerId,
          expect.objectContaining({ type: 'reembolso_solicitado' }),
        );
        expect(notificationsServiceMock.notifyAdmins).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'admin_reembolso_solicitado' }),
        );

        // É por este metadado que o painel abre os detalhes da solicitação.
        const [adminNotification] =
          notificationsServiceMock.notifyAdmins.mock.calls[0];
        expect(adminNotification.metadata).toEqual(
          expect.objectContaining({ refundId: orderId }),
        );
      });

      it('recusa pedido que nunca foi pago', async () => {
        // Cancelado ainda no carrinho: não há valor a devolver, por mais que
        // o status esteja na lista de elegíveis.
        mockExec.mockResolvedValueOnce(
          buildOrder({
            status: OrderStatus.ORDER_CANCELLED,
            paymentApproved: false,
          }),
        );

        await expect(
          service.requestRefund(orderId, ownerId, {}, userCtx),
        ).rejects.toThrow(BadRequestException);
      });

      it('recusa uma segunda solicitação para o mesmo pedido', async () => {
        mockExec.mockResolvedValueOnce(
          buildOrder({
            status: OrderStatus.REFUND_REJECTED,
            refund: { requestedAt: new Date(), resolvedAt: new Date() },
          }),
        );

        await expect(
          service.requestRefund(orderId, ownerId, {}, userCtx),
        ).rejects.toThrow(BadRequestException);

        expect(auditServiceMock.register).toHaveBeenCalledWith(
          expect.objectContaining({
            operation: OrderAuditOperation.REQUEST_REFUND,
            result: OrderAuditResult.DENIED,
          }),
        );
      });
    });

    describe('approveRefund (decisão do administrador)', () => {
      const pending = (overrides: Partial<OrderState> = {}) =>
        buildOrder({
          status: OrderStatus.REFUND_REQUESTED,
          refund: {
            requestedAt: new Date(),
            requestedBy: new Types.ObjectId(ownerId),
            amount: 6000,
            previousStatus: OrderStatus.PAYMENT_APPROVED,
          },
          ...overrides,
        });

      it('resolve a solicitação registrando quem decidiu', async () => {
        const order = pending();
        mockExec.mockResolvedValueOnce(order);

        const result = await service.approveRefund(
          orderId,
          { resolutionReason: 'Sessão cancelada' },
          adminCtx,
        );

        expect(order.status).toBe(OrderStatus.REFUND_APPROVED);
        expect(order.refund?.resolvedAt).toBeInstanceOf(Date);
        expect(order.refund?.resolvedBy).toEqual(new Types.ObjectId(adminId));
        expect(order.refund?.resolutionReason).toBe('Sessão cancelada');
        expect(result.order).toBe(order);

        expect(auditServiceMock.register).toHaveBeenCalledWith(
          expect.objectContaining({
            userId: adminId,
            operation: OrderAuditOperation.APPROVE_REFUND,
            result: OrderAuditResult.SUCCESS,
          }),
        );
        expect(notificationsServiceMock.notifyUser).toHaveBeenCalledWith(
          ownerId,
          expect.objectContaining({ type: 'reembolso_aprovado' }),
        );
      });

      it('devolve assento, estoque, ingresso e pontos da compra', async () => {
        const order = pending();
        mockExec.mockResolvedValueOnce(order);

        await service.approveRefund(orderId, {}, adminCtx);

        expect(sessionModelMock.updateOne).toHaveBeenCalled();
        expect(productsServiceMock.restoreStock).toHaveBeenCalledWith(
          productId.toString(),
          2,
        );
        expect(ticketModelMock.updateMany).toHaveBeenCalledWith(
          { _id: { $in: [ticketId] } },
          { $set: { status: TicketStatus.CANCELLED } },
        );
        expect(loyaltyServiceMock.revokeForOrder).toHaveBeenCalledWith({
          userId: ownerId,
          orderId,
        });
        expect(order.reservationReleasedAt).toBeInstanceOf(Date);
      });

      // Regressão: a análise do reembolso carrega o pedido com `populate`, e
      // `user`/`products.product` chegam como documento, não como ObjectId.
      it('devolve estoque e pontos mesmo com o pedido populado', async () => {
        const order = pending({
          user: {
            _id: new Types.ObjectId(ownerId),
            name: 'Ana',
            email: 'ana@smallville.com',
          } as unknown as Types.ObjectId,
          products: [
            {
              product: {
                _id: productId,
                name: 'Pipoca grande',
              } as unknown as Types.ObjectId,
              quantity: 2,
            },
          ],
        });
        mockExec.mockResolvedValueOnce(order);

        await service.approveRefund(orderId, {}, adminCtx);

        expect(productsServiceMock.restoreStock).toHaveBeenCalledWith(
          productId.toString(),
          2,
        );
        expect(loyaltyServiceMock.revokeForOrder).toHaveBeenCalledWith({
          userId: ownerId,
          orderId,
        });
        expect(notificationsServiceMock.notifyUser).toHaveBeenCalledWith(
          ownerId,
          expect.objectContaining({ type: 'reembolso_aprovado' }),
        );
      });

      it('não devolve nada duas vezes quando o pedido já foi cancelado', async () => {
        // O cancelamento do usuário já liberou assento, estoque e ingresso.
        const order = pending({
          reservationReleasedAt: new Date(),
          refund: {
            requestedAt: new Date(),
            amount: 6000,
            previousStatus: OrderStatus.ORDER_CANCELLED,
          },
        });
        mockExec.mockResolvedValueOnce(order);

        await service.approveRefund(orderId, {}, adminCtx);

        expect(sessionModelMock.updateOne).not.toHaveBeenCalled();
        expect(productsServiceMock.restoreStock).not.toHaveBeenCalled();
        expect(ticketModelMock.updateMany).not.toHaveBeenCalled();

        // A decisão em si acontece normalmente — o que não se repete é a
        // devolução dos recursos.
        expect(order.status).toBe(OrderStatus.REFUND_APPROVED);
      });

      it('reconhece a devolução já feita em pedido antigo, sem a marca de data', async () => {
        // Pedido gravado antes de `reservationReleasedAt` existir: os
        // ingressos já cancelados denunciam que a devolução ocorreu.
        ticketModelMock.countDocuments.mockResolvedValueOnce(0);

        const order = pending();
        mockExec.mockResolvedValueOnce(order);

        await service.approveRefund(orderId, {}, adminCtx);

        expect(productsServiceMock.restoreStock).not.toHaveBeenCalled();
        expect(ticketModelMock.updateMany).not.toHaveBeenCalled();
      });

      it('recusa a segunda aprovação da mesma solicitação', async () => {
        mockExec.mockResolvedValueOnce(
          buildOrder({
            status: OrderStatus.REFUND_APPROVED,
            refund: { requestedAt: new Date(), resolvedAt: new Date() },
          }),
        );

        await expect(
          service.approveRefund(orderId, {}, adminCtx),
        ).rejects.toThrow(ConflictException);

        expect(auditServiceMock.register).toHaveBeenCalledWith(
          expect.objectContaining({
            operation: OrderAuditOperation.APPROVE_REFUND,
            result: OrderAuditResult.DENIED,
          }),
        );
        expect(loyaltyServiceMock.revokeForOrder).not.toHaveBeenCalled();
      });

      it('responde 404 quando o pedido não tem solicitação', async () => {
        mockExec.mockResolvedValueOnce(buildOrder());

        await expect(
          service.approveRefund(orderId, {}, adminCtx),
        ).rejects.toThrow(NotFoundException);
      });

      it('nega a decisão ao usuário comum, mesmo sendo o dono do pedido', async () => {
        // A trava não é só do guard da rota: quem decide reembolso é regra
        // de negócio e vale para qualquer chamador do serviço.
        await expect(
          service.approveRefund(orderId, {}, userCtx),
        ).rejects.toThrow(ForbiddenException);

        expect(orderModelMock.findById).not.toHaveBeenCalled();
      });
    });

    describe('rejectRefund (decisão do administrador)', () => {
      const pending = () =>
        buildOrder({
          status: OrderStatus.REFUND_REQUESTED,
          refund: {
            requestedAt: new Date(),
            reason: 'Motivo do usuário',
            amount: 6000,
            previousStatus: OrderStatus.PAYMENT_APPROVED,
          },
        });

      it('recusa guardando o motivo do administrador sem apagar o do usuário', async () => {
        const order = pending();
        mockExec.mockResolvedValueOnce(order);

        await service.rejectRefund(
          orderId,
          { resolutionReason: 'Sessão já realizada' },
          adminCtx,
        );

        expect(order.status).toBe(OrderStatus.REFUND_REJECTED);
        expect(order.refund?.resolutionReason).toBe('Sessão já realizada');
        expect(order.refund?.reason).toBe('Motivo do usuário');
        expect(order.refund?.resolvedBy).toEqual(new Types.ObjectId(adminId));
      });

      it('informa o motivo da recusa ao comprador', async () => {
        mockExec.mockResolvedValueOnce(pending());

        await service.rejectRefund(
          orderId,
          { resolutionReason: 'Sessão já realizada' },
          adminCtx,
        );

        expect(notificationsServiceMock.notifyUser).toHaveBeenCalledWith(
          ownerId,
          expect.objectContaining({ type: 'reembolso_recusado' }),
        );

        // O motivo da decisão chega ao comprador dentro da mensagem.
        const [, notification] =
          notificationsServiceMock.notifyUser.mock.calls[0];
        expect(notification.message).toContain('Sessão já realizada');
      });

      it('mantém a compra intacta: nada é devolvido na recusa', async () => {
        mockExec.mockResolvedValueOnce(pending());

        await service.rejectRefund(
          orderId,
          { resolutionReason: 'Fora do prazo' },
          adminCtx,
        );

        expect(sessionModelMock.updateOne).not.toHaveBeenCalled();
        expect(productsServiceMock.restoreStock).not.toHaveBeenCalled();
        expect(ticketModelMock.updateMany).not.toHaveBeenCalled();
        expect(loyaltyServiceMock.revokeForOrder).not.toHaveBeenCalled();
      });

      it('recusa a segunda decisão sobre a mesma solicitação', async () => {
        mockExec.mockResolvedValueOnce(
          buildOrder({
            status: OrderStatus.REFUND_APPROVED,
            refund: { requestedAt: new Date(), resolvedAt: new Date() },
          }),
        );

        await expect(
          service.rejectRefund(orderId, { resolutionReason: 'x' }, adminCtx),
        ).rejects.toThrow(ConflictException);
      });
    });

    describe('listRefundRequests (fila de análise)', () => {
      it('lista apenas pedidos com solicitação aberta', async () => {
        mockExec.mockResolvedValue([]);

        await service.listRefundRequests({}, adminCtx);

        expect(orderModelMock.find).toHaveBeenCalledWith(
          expect.objectContaining({
            'refund.requestedAt': { $exists: true },
          }),
        );
      });

      it('nega a fila ao usuário comum', async () => {
        await expect(service.listRefundRequests({}, userCtx)).rejects.toThrow(
          ForbiddenException,
        );
      });
    });
  });
});
