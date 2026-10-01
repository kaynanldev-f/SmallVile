import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from '../schemas/order.schema';
import { ORDERS_MESSAGES } from '../messages/orders.message';
import { OrderMailService } from './order-mail.service';
import { StorageService } from 'src/storage/storage.service';
import {
  TicketPdfData,
  TicketPdfService,
} from 'src/tickets/service/ticket-pdf.service';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';
import { TicketStatus } from 'src/tickets/enums/ticket-status.enum';

// Formatos que os documentos assumem depois do populate abaixo. Só os campos
// que o ingresso precisa.
interface PopulatedUser {
  name: string;
  surname: string;
  email: string;
}

interface PopulatedSession {
  movieTitle: string;
  roomName: string;
  roomType?: string;
  language?: string;
  dateTime: string;
  cinemaId?: { name?: string };
}

interface PopulatedTicket {
  _id: Types.ObjectId;
  ticketNumber?: string;
  qrCode?: string;
  seatNumber: string;
  type: TicketType;
  status: TicketStatus;
  pricePaid: number;
}

interface PopulatedProductItem {
  product?: { name?: string };
  quantity: number;
  pricePaid: number;
}

export interface OrderDeliveryResult {
  pdfUrl?: string;
  emailSent: boolean;
  emailError?: string;
}

/**
 * Montagem do ingresso real do pedido: PDF gerado a partir dos dados
 * gravados na compra e envio por e-mail.
 */
@Injectable()
export class OrderReceiptService {
  private readonly logger = new Logger(OrderReceiptService.name);

  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly ticketPdfService: TicketPdfService,
    private readonly orderMailService: OrderMailService,
    private readonly storageService: StorageService,
  ) {}

  async buildPdfData(orderId: string): Promise<TicketPdfData> {
    const order = await this.orderModel
      .findById(orderId)
      .populate('user', 'name surname email')
      .populate({
        path: 'session',
        select: 'movieTitle roomName roomType language dateTime cinemaId',
        populate: { path: 'cinemaId', select: 'name' },
      })
      .populate('tickets')
      .populate('products.product', 'name')
      .exec();

    if (!order) {
      throw new NotFoundException(ORDERS_MESSAGES.ORDER_NOT_FOUND);
    }

    const user = order.user as unknown as PopulatedUser;
    const session = order.session as unknown as PopulatedSession;
    const tickets = order.tickets as unknown as PopulatedTicket[];
    const products = order.products as unknown as PopulatedProductItem[];

    const ticketsTotal = (tickets ?? []).reduce(
      (total, ticket) => total + (ticket.pricePaid ?? 0),
      0,
    );
    const productsTotal = (products ?? []).reduce(
      (total, item) => total + (item.pricePaid ?? 0),
      0,
    );

    return {
      orderId: order._id.toString(),
      orderCreatedAt: order.createdAt ?? new Date(),
      customerName: [user?.name, user?.surname].filter(Boolean).join(' '),
      customerEmail: user?.email ?? '',
      movieTitle: session?.movieTitle ?? '—',
      cinemaName: session?.cinemaId?.name,
      roomName: session?.roomName ?? '—',
      roomType: session?.roomType,
      language: session?.language,
      sessionDateTime: this.formatSessionDateTime(session?.dateTime),
      tickets: (tickets ?? []).map((ticket) => ({
        // Ingressos emitidos antes de o número existir continuam legíveis:
        // caímos no id do documento em vez de imprimir um campo vazio.
        ticketNumber: ticket.ticketNumber ?? ticket._id.toString(),
        qrCode: ticket.qrCode ?? ticket._id.toString(),
        seatNumber: ticket.seatNumber,
        type: ticket.type,
        status: ticket.status ?? TicketStatus.VALID,
        pricePaid: ticket.pricePaid,
      })),
      products: (products ?? []).map((item) => ({
        name: item.product?.name ?? 'Produto',
        quantity: item.quantity,
        pricePaid: item.pricePaid,
      })),
      ticketsTotal,
      productsTotal,
      discountAmount: order.discountAmount ?? 0,
      totalAmount: order.totalAmount ?? 0,
    };
  }

  async generatePdf(orderId: string): Promise<Buffer> {
    const data = await this.buildPdfData(orderId);
    return this.ticketPdfService.generate(data);
  }

  /**
   * Gera o PDF, publica no Storage e envia por e-mail, registrando o
   * resultado no próprio pedido.
   */
  async deliver(orderId: string): Promise<OrderDeliveryResult> {
    const data = await this.buildPdfData(orderId);
    const pdf = await this.ticketPdfService.generate(data);

    const pdfUrl = await this.publishPdf(orderId, pdf);
    const { sent, error } = await this.orderMailService.send(data, pdf);

    await this.orderModel.updateOne(
      { _id: orderId },
      {
        $set: {
          ticketPdfUrl: pdfUrl,
          confirmationEmailSentAt: sent ? new Date() : null,
          confirmationEmailError: sent ? null : error,
        },
      },
    );

    return { pdfUrl, emailSent: sent, emailError: error };
  }

  // O PDF no Storage é uma conveniência (link direto para download); se o
  // upload falhar, o download pela API continua funcionando porque o PDF é
  // regerado sob demanda.
  private async publishPdf(
    orderId: string,
    pdf: Buffer,
  ): Promise<string | undefined> {
    try {
      const { url } = await this.storageService.uploadBuffer(
        pdf,
        `ingressos/${orderId}.pdf`,
        'application/pdf',
      );
      return url;
    } catch (error) {
      this.logger.warn(
        `Não foi possível publicar o PDF do pedido ${orderId} no Storage: ${
          error instanceof Error ? error.message : 'erro desconhecido'
        }`,
      );
      return undefined;
    }
  }

  private formatSessionDateTime(dateTime?: string): string {
    if (!dateTime) {
      return '—';
    }

    const parsed = new Date(dateTime);
    if (Number.isNaN(parsed.getTime())) {
      return dateTime;
    }

    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(parsed);
  }
}
