import { Injectable, InternalServerErrorException } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as QRCode from 'qrcode';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import { TICKETS_MESSAGES } from '../messages/tickets.message';

export interface TicketPdfItem {
  ticketNumber: string;
  qrCode: string;
  seatNumber: string;
  type: TicketType;
  status: TicketStatus;
  pricePaid: number;
}

export interface TicketPdfProduct {
  name: string;
  quantity: number;
  pricePaid: number;
}

// Todos os valores monetários chegam em centavos, como são gravados no
// banco (ver os virtuals `priceFormatted` dos schemas).
export interface TicketPdfData {
  orderId: string;
  orderCreatedAt: Date;
  customerName: string;
  customerEmail: string;
  movieTitle: string;
  cinemaName?: string;
  roomName: string;
  roomType?: string;
  language?: string;
  sessionDateTime: string;
  tickets: TicketPdfItem[];
  products: TicketPdfProduct[];
  ticketsTotal: number;
  productsTotal: number;
  discountAmount: number;
  totalAmount: number;
}

const PAGE_MARGIN = 40;
const COLOR_PRIMARY = '#1F1B2E';
const COLOR_ACCENT = '#E50914';
const COLOR_MUTED = '#6B6B7B';
const COLOR_BORDER = '#D9D9E3';

/** Geração do ingresso em PDF a partir dos dados reais da compra. */
@Injectable()
export class TicketPdfService {
  async generate(data: TicketPdfData): Promise<Buffer> {
    try {
      // Os QR Codes são gerados antes de abrir o documento: `doc.image` é
      // síncrono e não aceita esperar por uma Promise no meio da escrita.
      const qrImages = await Promise.all(
        data.tickets.map((ticket) =>
          QRCode.toBuffer(ticket.qrCode, { width: 240, margin: 1 }),
        ),
      );

      return await this.render(data, qrImages);
    } catch (error) {
      throw new InternalServerErrorException(
        TICKETS_MESSAGES.TICKET_PDF_FAILED,
        { cause: error instanceof Error ? error : undefined },
      );
    }
  }

  private render(data: TicketPdfData, qrImages: Buffer[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: PAGE_MARGIN,
        info: {
          Title: `Ingresso - ${data.movieTitle}`,
          Author: data.cinemaName ?? 'Smallville Cinemas',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      data.tickets.forEach((ticket, index) => {
        if (index > 0) {
          doc.addPage();
        }
        this.renderTicketPage(doc, data, ticket, qrImages[index]);
      });

      // Sem ingressos (pedido só de bomboniere) o documento ainda precisa de
      // uma página para o resumo.
      if (data.tickets.length > 0) {
        doc.addPage();
      }
      this.renderSummaryPage(doc, data);

      doc.end();
    });
  }

  private renderTicketPage(
    doc: PDFKit.PDFDocument,
    data: TicketPdfData,
    ticket: TicketPdfItem,
    qrImage: Buffer,
  ): void {
    this.renderHeader(doc, data);

    const contentTop = 150;

    doc
      .fillColor(COLOR_PRIMARY)
      .font('Helvetica-Bold')
      .fontSize(22)
      .text(data.movieTitle, PAGE_MARGIN, contentTop, {
        width: 320,
        ellipsis: true,
      });

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLOR_MUTED)
      .text(
        [data.language, data.roomType].filter(Boolean).join(' • '),
        PAGE_MARGIN,
        doc.y + 4,
        { width: 320 },
      );

    const detailsTop = doc.y + 20;

    this.renderField(doc, 'DATA E HORÁRIO', data.sessionDateTime, {
      x: PAGE_MARGIN,
      y: detailsTop,
    });
    this.renderField(doc, 'CINEMA', data.cinemaName ?? '—', {
      x: PAGE_MARGIN + 170,
      y: detailsTop,
    });

    this.renderField(doc, 'SALA', data.roomName, {
      x: PAGE_MARGIN,
      y: detailsTop + 58,
    });
    this.renderField(doc, 'ASSENTO', ticket.seatNumber, {
      x: PAGE_MARGIN + 170,
      y: detailsTop + 58,
    });

    this.renderField(doc, 'TIPO', this.describeTicketType(ticket.type), {
      x: PAGE_MARGIN,
      y: detailsTop + 116,
    });
    this.renderField(doc, 'VALOR', this.formatCurrency(ticket.pricePaid), {
      x: PAGE_MARGIN + 170,
      y: detailsTop + 116,
    });

    this.renderField(doc, 'CLIENTE', data.customerName, {
      x: PAGE_MARGIN,
      y: detailsTop + 174,
      width: 320,
    });

    // QR Code e número do ingresso, na coluna da direita.
    const qrX = doc.page.width - PAGE_MARGIN - 180;
    doc.image(qrImage, qrX, contentTop, { width: 180 });

    doc
      .font('Helvetica-Bold')
      .fontSize(12)
      .fillColor(COLOR_PRIMARY)
      .text(ticket.ticketNumber, qrX, contentTop + 190, {
        width: 180,
        align: 'center',
      });

    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(COLOR_MUTED)
      .text(
        `Ingresso ${this.describeTicketStatus(ticket.status)}`,
        qrX,
        doc.y + 2,
        { width: 180, align: 'center' },
      );

    this.renderFooter(
      doc,
      `Pedido ${data.orderId} • Apresente este QR Code na entrada da sala.`,
    );
  }

  private renderSummaryPage(
    doc: PDFKit.PDFDocument,
    data: TicketPdfData,
  ): void {
    this.renderHeader(doc, data);

    let cursor = 150;

    doc
      .font('Helvetica-Bold')
      .fontSize(18)
      .fillColor(COLOR_PRIMARY)
      .text('Resumo do pedido', PAGE_MARGIN, cursor);

    cursor = doc.y + 6;

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(COLOR_MUTED)
      .text(
        `Pedido ${data.orderId} • Comprado em ${this.formatDateTime(data.orderCreatedAt)}`,
        PAGE_MARGIN,
        cursor,
      );

    cursor = doc.y + 20;

    if (data.tickets.length > 0) {
      cursor = this.renderSectionTitle(doc, 'Ingressos', cursor);

      for (const ticket of data.tickets) {
        cursor = this.renderLine(
          doc,
          `Assento ${ticket.seatNumber} — ${this.describeTicketType(ticket.type)} (${ticket.ticketNumber})`,
          this.formatCurrency(ticket.pricePaid),
          cursor,
        );
      }

      cursor += 10;
    }

    if (data.products.length > 0) {
      cursor = this.renderSectionTitle(doc, 'Bomboniere', cursor);

      for (const product of data.products) {
        cursor = this.renderLine(
          doc,
          `${product.quantity}x ${product.name}`,
          this.formatCurrency(product.pricePaid),
          cursor,
        );
      }

      cursor += 10;
    }

    cursor = this.renderSectionTitle(doc, 'Totais', cursor);
    cursor = this.renderLine(
      doc,
      'Ingressos',
      this.formatCurrency(data.ticketsTotal),
      cursor,
    );
    cursor = this.renderLine(
      doc,
      'Bomboniere',
      this.formatCurrency(data.productsTotal),
      cursor,
    );

    if (data.discountAmount > 0) {
      cursor = this.renderLine(
        doc,
        'Desconto',
        `- ${this.formatCurrency(data.discountAmount)}`,
        cursor,
      );
    }

    doc
      .moveTo(PAGE_MARGIN, cursor + 4)
      .lineTo(doc.page.width - PAGE_MARGIN, cursor + 4)
      .strokeColor(COLOR_BORDER)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLOR_PRIMARY)
      .text('Total pago', PAGE_MARGIN, cursor + 16)
      .text(this.formatCurrency(data.totalAmount), PAGE_MARGIN, cursor + 16, {
        width: doc.page.width - PAGE_MARGIN * 2,
        align: 'right',
      });

    this.renderFooter(doc, `Comprovante enviado para ${data.customerEmail}.`);
  }

  private renderHeader(doc: PDFKit.PDFDocument, data: TicketPdfData): void {
    doc
      .rect(0, 0, doc.page.width, 96)
      .fill(COLOR_PRIMARY)
      .fillColor('#FFFFFF')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(data.cinemaName ?? 'Smallville Cinemas', PAGE_MARGIN, 32)
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#C9C9D4')
      .text('Ingresso eletrônico', PAGE_MARGIN, 62);

    doc
      .rect(0, 96, doc.page.width, 4)
      .fill(COLOR_ACCENT)
      .fillColor(COLOR_PRIMARY);
  }

  private renderFooter(doc: PDFKit.PDFDocument, text: string): void {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLOR_MUTED)
      .text(text, PAGE_MARGIN, doc.page.height - PAGE_MARGIN - 12, {
        width: doc.page.width - PAGE_MARGIN * 2,
        align: 'center',
      });
  }

  private renderField(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    position: { x: number; y: number; width?: number },
  ): void {
    const width = position.width ?? 150;

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(COLOR_MUTED)
      .text(label, position.x, position.y, { width });

    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .fillColor(COLOR_PRIMARY)
      .text(value, position.x, position.y + 12, { width, ellipsis: true });
  }

  private renderSectionTitle(
    doc: PDFKit.PDFDocument,
    title: string,
    y: number,
  ): number {
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(COLOR_ACCENT)
      .text(title.toUpperCase(), PAGE_MARGIN, y);

    return doc.y + 6;
  }

  private renderLine(
    doc: PDFKit.PDFDocument,
    label: string,
    value: string,
    y: number,
  ): number {
    const contentWidth = doc.page.width - PAGE_MARGIN * 2;

    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(COLOR_PRIMARY)
      .text(label, PAGE_MARGIN, y, { width: contentWidth - 90, ellipsis: true })
      .text(value, PAGE_MARGIN, y, { width: contentWidth, align: 'right' });

    return doc.y + 6;
  }

  private describeTicketType(type: TicketType): string {
    return type === TicketType.HALF ? 'Meia-entrada' : 'Inteira';
  }

  private describeTicketStatus(status: TicketStatus): string {
    switch (status) {
      case TicketStatus.USED:
        return 'utilizado';
      case TicketStatus.CANCELLED:
        return 'cancelado';
      default:
        return 'válido';
    }
  }

  private formatCurrency(valueInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format((valueInCents ?? 0) / 100);
  }

  private formatDateTime(value: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(value);
  }
}
