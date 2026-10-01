/** Contrato do pedido — espelhado do backend (smallville-backend). */

import type { MovieLanguage, ProductCategory, ProductSize, RoomType } from "./admin";
import type { TicketType } from "./ticket";

/** Valores de `OrderStatus` no backend (português). */
export type OrderStatus =
  | "pedido_realizado"
  | "pagamento_pendente"
  | "pagamento_aprovado"
  | "pagamento_recusado"
  | "pedido_cancelado"
  | "expirado"
  | "reembolso_solicitado"
  | "reembolso_aprovado"
  | "reembolso_recusado";

export interface OrderSeatItem {
  seatNumber: string;
  type: TicketType;
  /** Em centavos. */
  pricePaid: number;
}

export interface OrderProductItem {
  id: string;
  name: string;
  category?: ProductCategory;
  size?: ProductSize;
  imageUrl?: string;
  quantity: number;
  /** Preço unitário em centavos. */
  unitPrice: number;
  /** Total da linha em centavos (unitário × quantidade). */
  pricePaid: number;
}

/** Ciclo de vida da solicitação de reembolso, como o backend grava em `order.refund`. */
export interface RefundInfo {
  /** ISO. Presente desde a abertura da solicitação. */
  requestedAt?: string;
  requestedBy?: string;
  /** Motivo informado pelo COMPRADOR ao solicitar. Opcional. */
  reason?: string;
  /** Valor integral congelado na solicitação, em centavos. */
  amount?: number;
  /** Status do pedido quando a solicitação foi aberta. */
  previousStatus?: OrderStatus;
  /** ISO. Só existe depois da decisão do administrador. */
  resolvedAt?: string;
  resolvedBy?: string;
  /** Justificativa do ADMINISTRADOR. Obrigatória na recusa. */
  resolutionReason?: string;
}

export interface Order {
  id: string;
  status: OrderStatus;
  createdAt: string;

  seats: OrderSeatItem[];
  products: OrderProductItem[];
  /** Ingressos efetivamente emitidos (só existem após o pagamento aprovado). */
  ticketsCount: number;

  /** Todos em centavos. */
  subtotal: number;
  discount: number;
  total: number;
  ticketsTotal: number;
  productsTotal: number;

  paymentApproved: boolean;
  ticketAvailable: boolean;
  /** Motivo informado na recusa do pagamento, quando existir. */
  paymentFailureReason?: string;

  /** Ausente enquanto o pedido nunca teve solicitação de reembolso. */
  refund?: RefundInfo;

  movieTitle?: string;
  movieBanner?: string;
  roomName?: string;
  roomType?: RoomType;
  language?: MovieLanguage;
  /** "DD/MM/AAAA HH:MM" */
  sessionDateTime?: string;
  cinemaName?: string;

  user?: { id: string; name: string; email: string };
}

export interface OrdersPage {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}
