import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { OrderReceiptService } from './order-receipt.service';
import { OrderMailService } from './order-mail.service';
import { Order } from '../schemas/order.schema';
import { StorageService } from 'src/storage/storage.service';
import { TicketPdfService } from 'src/tickets/service/ticket-pdf.service';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';
import { TicketStatus } from 'src/tickets/enums/ticket-status.enum';

describe('OrderReceiptService (Unitário)', () => {
  let service: OrderReceiptService;

  const orderId = new Types.ObjectId();
  const ticketId = new Types.ObjectId();

  // Documento como ele volta do banco depois dos populates.
  const populatedOrder = {
    _id: orderId,
    createdAt: new Date('2026-08-18T14:30:00.000Z'),
    discountAmount: 0,
    totalAmount: 8600,
    ticketPdfUrl: undefined,
    user: { name: 'João', surname: 'Silva', email: 'joao@example.com' },
    session: {
      movieTitle: 'Interestelar',
      roomName: 'Sala 3',
      roomType: '3D',
      language: 'Dublado',
      dateTime: '2026-08-20T19:30:00.000Z',
      cinemaId: { name: 'Smallville Shopping' },
    },
    tickets: [
      {
        _id: ticketId,
        ticketNumber: 'SMV-20260818-ABCD1234',
        qrCode: 'SMV-20260818-ABCD1234.ASSINATURA',
        seatNumber: 'A10',
        type: TicketType.FULL,
        status: TicketStatus.VALID,
        pricePaid: 4500,
      },
    ],
    products: [
      { product: { name: 'Pipoca Grande' }, quantity: 1, pricePaid: 4100 },
    ],
  };

  type Filter = Record<string, unknown>;

  // `findById().populate()...populate().exec()` — cada populate devolve o
  // próprio encadeamento.
  interface QueryMock {
    populate: jest.Mock;
    exec: jest.Mock;
  }

  const execMock = jest.fn();
  const queryMock: QueryMock = {
    populate: jest.fn((): QueryMock => queryMock),
    exec: execMock,
  };

  const orderModelMock = {
    findById: jest.fn((): QueryMock => queryMock),
    updateOne: jest.fn((filter?: Filter, update?: { $set: Filter }) => {
      void filter;
      void update;
      return Promise.resolve({ acknowledged: true });
    }),
  };

  const pdfBuffer = Buffer.from('%PDF-1.3 conteudo');
  const ticketPdfServiceMock = {
    generate: jest.fn().mockResolvedValue(pdfBuffer),
  };
  const orderMailServiceMock = { send: jest.fn() };
  const storageServiceMock = { uploadBuffer: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderReceiptService,
        { provide: getModelToken(Order.name), useValue: orderModelMock },
        { provide: TicketPdfService, useValue: ticketPdfServiceMock },
        { provide: OrderMailService, useValue: orderMailServiceMock },
        { provide: StorageService, useValue: storageServiceMock },
      ],
    }).compile();

    service = module.get<OrderReceiptService>(OrderReceiptService);
    execMock.mockResolvedValue(populatedOrder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('buildPdfData', () => {
    it('deve montar o ingresso com os dados reais da compra', async () => {
      const data = await service.buildPdfData(orderId.toString());

      expect(data).toMatchObject({
        orderId: orderId.toString(),
        customerName: 'João Silva',
        customerEmail: 'joao@example.com',
        movieTitle: 'Interestelar',
        cinemaName: 'Smallville Shopping',
        roomName: 'Sala 3',
        totalAmount: 8600,
      });

      expect(data.tickets).toHaveLength(1);
      expect(data.tickets[0].ticketNumber).toBe('SMV-20260818-ABCD1234');
      expect(data.tickets[0].seatNumber).toBe('A10');
      expect(data.products).toEqual([
        { name: 'Pipoca Grande', quantity: 1, pricePaid: 4100 },
      ]);
    });

    it('deve somar os totais de ingressos e bomboniere a partir dos itens', async () => {
      const data = await service.buildPdfData(orderId.toString());

      expect(data.ticketsTotal).toBe(4500);
      expect(data.productsTotal).toBe(4100);
    });

    it('deve lançar 404 quando o pedido não existe', async () => {
      execMock.mockResolvedValueOnce(null);

      await expect(service.buildPdfData(orderId.toString())).rejects.toThrow();
    });
  });

  describe('deliver', () => {
    it('deve gerar o PDF, publicá-lo e enviar o e-mail', async () => {
      storageServiceMock.uploadBuffer.mockResolvedValueOnce({
        url: 'https://storage.example/ingresso.pdf',
      });
      orderMailServiceMock.send.mockResolvedValueOnce({ sent: true });

      const result = await service.deliver(orderId.toString());

      expect(ticketPdfServiceMock.generate).toHaveBeenCalled();
      expect(orderMailServiceMock.send).toHaveBeenCalledWith(
        expect.objectContaining({ customerEmail: 'joao@example.com' }),
        pdfBuffer,
      );
      expect(result).toEqual({
        pdfUrl: 'https://storage.example/ingresso.pdf',
        emailSent: true,
        emailError: undefined,
      });
    });

    it('deve registrar a data de envio no pedido quando o e-mail é entregue', async () => {
      storageServiceMock.uploadBuffer.mockResolvedValueOnce({ url: 'url' });
      orderMailServiceMock.send.mockResolvedValueOnce({ sent: true });

      await service.deliver(orderId.toString());

      const [filter, update] = orderModelMock.updateOne.mock.calls[0];
      expect(filter).toEqual({ _id: orderId.toString() });
      expect(update.$set).toMatchObject({
        ticketPdfUrl: 'url',
        confirmationEmailError: null,
      });
      expect(update.$set.confirmationEmailSentAt).toBeInstanceOf(Date);
    });

    it('deve registrar a falha sem derrubar a compra quando o e-mail não é enviado', async () => {
      storageServiceMock.uploadBuffer.mockResolvedValueOnce({ url: 'url' });
      orderMailServiceMock.send.mockResolvedValueOnce({
        sent: false,
        error: 'SMTP indisponível',
      });

      const result = await service.deliver(orderId.toString());

      expect(result.emailSent).toBe(false);

      const [, update] = orderModelMock.updateOne.mock.calls[0];
      expect(update.$set).toMatchObject({
        confirmationEmailSentAt: null,
        confirmationEmailError: 'SMTP indisponível',
      });
    });

    it('deve seguir com o envio do e-mail mesmo se a publicação no Storage falhar', async () => {
      storageServiceMock.uploadBuffer.mockRejectedValueOnce(
        new Error('Storage fora do ar'),
      );
      orderMailServiceMock.send.mockResolvedValueOnce({ sent: true });

      const result = await service.deliver(orderId.toString());

      expect(result.pdfUrl).toBeUndefined();
      expect(result.emailSent).toBe(true);
    });
  });
});
