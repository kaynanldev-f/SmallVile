import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { TicketPdfData } from 'src/tickets/service/ticket-pdf.service';

/** E-mail de confirmação de compra, com o ingresso em PDF anexado. */
@Injectable()
export class OrderMailService {
  private readonly logger = new Logger(OrderMailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async send(
    data: TicketPdfData,
    pdf: Buffer,
  ): Promise<{ sent: boolean; error?: string }> {
    try {
      await this.mailerService.sendMail({
        to: data.customerEmail,
        subject: `Compra confirmada — ${data.movieTitle}`,
        html: this.buildHtml(data),
        attachments: [
          {
            filename: `ingresso-${data.orderId}.pdf`,
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      });

      return { sent: true };
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : 'erro desconhecido';

      this.logger.error(
        `Falha ao enviar o e-mail de confirmação do pedido ${data.orderId}: ${reason}`,
        error instanceof Error ? error.stack : undefined,
      );

      return { sent: false, error: reason };
    }
  }

  private buildHtml(data: TicketPdfData): string {
    const seats = data.tickets.map((ticket) => ticket.seatNumber).join(', ');

    const productLines = data.products
      .map(
        (product) =>
          `<li>${product.quantity}x ${this.escape(product.name)} — ${this.formatCurrency(product.pricePaid)}</li>`,
      )
      .join('');

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #1F1B2E;">
        <h2>Compra confirmada!</h2>
        <p>Olá, ${this.escape(data.customerName)}. Seu pagamento foi aprovado e os ingressos já estão emitidos.</p>

        <h3>${this.escape(data.movieTitle)}</h3>
        <ul>
          <li><strong>Pedido:</strong> ${data.orderId}</li>
          <li><strong>Data e horário:</strong> ${this.escape(data.sessionDateTime)}</li>
          <li><strong>Cinema:</strong> ${this.escape(data.cinemaName ?? '—')}</li>
          <li><strong>Sala:</strong> ${this.escape(data.roomName)}</li>
          <li><strong>Assentos:</strong> ${this.escape(seats || '—')}</li>
          <li><strong>Ingressos:</strong> ${data.tickets.length}</li>
        </ul>

        ${productLines ? `<h4>Bomboniere</h4><ul>${productLines}</ul>` : ''}

        <p><strong>Total pago: ${this.formatCurrency(data.totalAmount)}</strong></p>

        <p>O ingresso em PDF está anexado a este e-mail. Apresente o QR Code na entrada da sala.</p>
        <p style="color: #6B6B7B; font-size: 12px;">Bom filme! — Smallville Cinemas</p>
      </div>
    `;
  }

  // Nome do cliente e do produto vêm do banco: escapamos para que o e-mail
  // não vire um vetor de injeção de HTML.
  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private formatCurrency(valueInCents: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format((valueInCents ?? 0) / 100);
  }
}
