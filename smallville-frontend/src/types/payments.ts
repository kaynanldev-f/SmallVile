import type { TicketType } from "./ticket";

/** Enums de pagamento espelhados do backend (smallville-backend). */
export const PAYMENT_METHODS = {
  PIX: "pix",
  CREDIT_CARD: "cartao_credito",
  DEBIT_CARD: "cartao_debito",
} as const;

export type PaymentMethod =
  (typeof PAYMENT_METHODS)[keyof typeof PAYMENT_METHODS];

/** Rótulos exibidos ao usuário. Os valores continuam sendo os do backend. */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "PIX",
  cartao_credito: "Cartão de crédito",
  cartao_debito: "Cartão de débito",
};

export const PAYMENT_STATUSES = {
  PENDING: "pendente",
  APPROVED: "aprovado",
  REFUSED: "recusado",
  EXPIRED: "expirado",
} as const;

export type PaymentStatus =
  (typeof PAYMENT_STATUSES)[keyof typeof PAYMENT_STATUSES];

/** Desfechos definitivos: não vale mais consultar nem cobrar de novo. */
export const FINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PAYMENT_STATUSES.APPROVED,
  PAYMENT_STATUSES.REFUSED,
  PAYMENT_STATUSES.EXPIRED,
];

/** Formas de pagamento que o sistema realmente processa hoje. */
export const AVAILABLE_PAYMENT_METHODS: PaymentMethod[] = [PAYMENT_METHODS.PIX];

export function isPaymentMethodAvailable(method: PaymentMethod): boolean {
  return AVAILABLE_PAYMENT_METHODS.includes(method);
}

/** Limites de `RejectPaymentDto.reason` no backend (`@MinLength(3)` / `@MaxLength(255)`). */
export const REJECTION_REASON_MIN_LENGTH = 3;
export const REJECTION_REASON_MAX_LENGTH = 255;

export interface Ticket {
  id: string;
  description: string;
  seatNumber: string;
  type: TicketType;
  /** Em centavos, como devolvido pelo backend em `order.seats[].pricePaid`. */
  price: number;
}

export interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export interface PurchaseSummary {
  _id: string;

  movie: string;
  session: string;
  room: string;
  seats: string[];
  tickets: Ticket[];
  products: Product[];
  discount: number;
  total: number;
}
