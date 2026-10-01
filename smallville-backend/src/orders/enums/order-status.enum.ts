export enum OrderStatus {
  ORDER_PLACED = 'pedido_realizado',
  PAYMENT_PENDING = 'pagamento_pendente',
  PAYMENT_APPROVED = 'pagamento_aprovado',
  PAYMENT_REFUSED = 'pagamento_recusado',
  ORDER_CANCELLED = 'pedido_cancelado',
  ORDER_EXPIRED = 'expirado',
  REFUND_REQUESTED = 'reembolso_solicitado',
  REFUND_APPROVED = 'reembolso_aprovado',
  REFUND_REJECTED = 'reembolso_recusado',
}

export const TICKET_ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAYMENT_APPROVED,
];

// Pedido ainda em montagem (carrinho): produtos podem ser adicionados ou
// removidos.
export const EDITABLE_STATUSES: OrderStatus[] = [
  OrderStatus.ORDER_PLACED,
  OrderStatus.PAYMENT_REFUSED,
];

// Pedido que ainda pode receber uma (nova) tentativa de pagamento.
export const PAYABLE_STATUSES: OrderStatus[] = [
  OrderStatus.ORDER_PLACED,
  OrderStatus.PAYMENT_PENDING,
  OrderStatus.PAYMENT_REFUSED,
];

export const TERMINAL_STATUSES: OrderStatus[] = [
  OrderStatus.ORDER_CANCELLED,
  OrderStatus.ORDER_EXPIRED,
  OrderStatus.REFUND_APPROVED,
];

/**
 * Status a partir dos quais o dono do pedido pode abrir uma solicitação de
 * reembolso.
 */
export const REFUND_ELIGIBLE_STATUSES: OrderStatus[] = [
  OrderStatus.PAYMENT_APPROVED,
  OrderStatus.ORDER_CANCELLED,
];

/**
 * Situações de uma solicitação de reembolso, na ordem do fluxo: solicitada →
 * aprovada ou recusada.
 */
export const REFUND_STATUSES: OrderStatus[] = [
  OrderStatus.REFUND_REQUESTED,
  OrderStatus.REFUND_APPROVED,
  OrderStatus.REFUND_REJECTED,
];

/** Solicitação já decidida pelo administrador. */
export const REFUND_RESOLVED_STATUSES: OrderStatus[] = [
  OrderStatus.REFUND_APPROVED,
  OrderStatus.REFUND_REJECTED,
];
