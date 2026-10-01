import type { Classification, MovieLanguage, RoomType } from "./admin";

export type TicketType = "INTEIRA" | "MEIA";

/** Espelha `TicketStatus` do backend (tickets/enums/ticket-status.enum.ts). */
export type TicketStatus = "valido" | "utilizado" | "cancelado";

/** Ingresso como a tela precisa dele. */
export interface Ticket {
  _id: string;
  /** `ticketNumber` do backend ("SMV-20260818-9F3AC1B2"). */
  ticketNumber?: string;
  /** O que é exibido como código do ingresso. */
  code: string;
  type: TicketType;
  seatNumber: string;
  /** Em centavos. */
  price: number;
  /** ISO, do timestamp de criação do ingresso. */
  purchasedAt: string;
  status: TicketStatus;

  /** Conteúdo assinado do QR (`ticketNumber.HMAC`), emitido pelo backend. */
  qrPayload?: string;
  /** PNG em data URL gerado a partir de `qrPayload`. */
  qrImage?: string;

  sessionId: string;
  /** "DD/MM/AAAA HH:MM" */
  sessionDateTime: string;
  roomName: string;
  roomType?: RoomType;
  language?: MovieLanguage;

  movieId?: string;
  movieTitle: string;
  movieBanner?: string;
  classification?: Classification;

  cinemaName?: string;
  cinemaCity?: string;

  /** Pedido de origem. Ingressos emitidos pelo admin não têm pedido. */
  orderId?: string;
  /** URL do PDF gerado pelo backend, quando já emitido. */
  ticketPdfUrl?: string;

  holderName?: string;
  holderEmail?: string;
}
