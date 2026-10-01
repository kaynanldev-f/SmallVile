import { TicketPdfService, TicketPdfData } from './ticket-pdf.service';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';

describe('TicketPdfService (Unitário)', () => {
  // A primeira renderização carrega as fontes AFM do pdfkit do disco, o que
  // passa dos 5s padrão do Jest quando a suíte inteira roda em paralelo.
  jest.setTimeout(30000);

  const service = new TicketPdfService();

  const data: TicketPdfData = {
    orderId: '667f123abc456def78901234',
    orderCreatedAt: new Date('2026-08-18T14:30:00.000Z'),
    customerName: 'João Silva',
    customerEmail: 'joao@example.com',
    movieTitle: 'Interestelar',
    cinemaName: 'Smallville Shopping',
    roomName: 'Sala 3',
    roomType: '3D',
    language: 'Dublado',
    sessionDateTime: '20/08/2026 19:30',
    tickets: [
      {
        ticketNumber: 'SMV-20260818-ABCD1234',
        qrCode: 'SMV-20260818-ABCD1234.ASSINATURA',
        seatNumber: 'A10',
        type: TicketType.FULL,
        status: TicketStatus.VALID,
        pricePaid: 3000,
      },
      {
        ticketNumber: 'SMV-20260818-EF567890',
        qrCode: 'SMV-20260818-EF567890.ASSINATURA',
        seatNumber: 'A11',
        type: TicketType.HALF,
        status: TicketStatus.VALID,
        pricePaid: 1500,
      },
    ],
    products: [
      { name: 'Pipoca Grande', quantity: 1, pricePaid: 2500 },
      { name: 'Refrigerante', quantity: 2, pricePaid: 1600 },
    ],
    ticketsTotal: 4500,
    productsTotal: 4100,
    discountAmount: 0,
    totalAmount: 8600,
  };

  it('deve gerar um arquivo PDF válido', async () => {
    const pdf = await service.generate(data);

    expect(Buffer.isBuffer(pdf)).toBe(true);
    // Assinatura de um arquivo PDF.
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
  });

  it('deve gerar documentos diferentes para compras diferentes', async () => {
    const other: TicketPdfData = {
      ...data,
      orderId: '667f123abc456def78905555',
      customerName: 'Maria Souza',
      tickets: [{ ...data.tickets[0], seatNumber: 'B4' }],
    };

    const [first, second] = await Promise.all([
      service.generate(data),
      service.generate(other),
    ]);

    // Cada ingresso é único: o conteúdo não pode ser o mesmo arquivo.
    expect(first.equals(second)).toBe(false);
  });

  it('deve gerar o PDF de um pedido somente de bomboniere, sem ingressos', async () => {
    const pdf = await service.generate({
      ...data,
      tickets: [],
      ticketsTotal: 0,
      totalAmount: data.productsTotal,
    });

    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  });
});
