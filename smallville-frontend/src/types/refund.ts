/** Contrato do reembolso — espelhado do backend (smallville-backend). */

import type { Order, OrderStatus } from "./order";

/** Situações de uma solicitação. */
export const REFUND_STATUSES = {
  REQUESTED: "reembolso_solicitado",
  APPROVED: "reembolso_aprovado",
  REJECTED: "reembolso_recusado",
} as const;

export type RefundStatus =
  (typeof REFUND_STATUSES)[keyof typeof REFUND_STATUSES];

/** A ordem em que os filtros aparecem na tela. */
export const REFUND_STATUS_ORDER: RefundStatus[] = [
  REFUND_STATUSES.REQUESTED,
  REFUND_STATUSES.APPROVED,
  REFUND_STATUSES.REJECTED,
];

/** Rótulos do ciclo. */
export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  reembolso_solicitado: "Reembolso em análise",
  reembolso_aprovado: "Reembolso aprovado",
  reembolso_recusado: "Reembolso recusado",
};

/** Cores do ciclo, na mesma linguagem visual do resto do sistema. */
export const REFUND_STATUS_TONES: Record<RefundStatus, string> = {
  reembolso_solicitado: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  reembolso_aprovado: "border-green-500/40 bg-green-500/10 text-green-300",
  reembolso_recusado: "border-red-500/40 bg-red-500/10 text-red-300",
};

export function isRefundStatus(value: string): value is RefundStatus {
  return (REFUND_STATUS_ORDER as string[]).includes(value);
}

/** Uma solicitação já decidida — não aceita nova aprovação nem nova recusa. */
export function isRefundResolved(status: OrderStatus): boolean {
  return (
    status === REFUND_STATUSES.APPROVED || status === REFUND_STATUSES.REJECTED
  );
}

/** Status a partir dos quais o dono do pedido pode ABRIR a solicitação. */
export const REFUND_ELIGIBLE_ORDER_STATUSES: OrderStatus[] = [
  "pagamento_aprovado",
  "pedido_cancelado",
];

/** Espelho de `OrdersService.isRefundAllowed`. */
export function canRequestRefund(order: Order): boolean {
  if (!order.paymentApproved) return false;
  if (order.refund?.requestedAt) return false;

  return REFUND_ELIGIBLE_ORDER_STATUSES.includes(order.status);
}

/** Limite de `RequestRefundDto.reason` no backend (`@MaxLength(500)`). */
export const REFUND_REASON_MAX_LENGTH = 500;

/** Limites de `resolutionReason` em `ApproveRefundDto` e `RejectRefundDto`. */
export const RESOLUTION_REASON_MIN_LENGTH = 3;
export const RESOLUTION_REASON_MAX_LENGTH = 500;

/** Uma linha da fila de análise. */
export type RefundRequest = Order;

export interface RefundsPage {
  items: RefundRequest[];
  total: number;
  page: number;
  limit: number;
  /** Solicitações aguardando decisão em TODA a base, independente do filtro. */
  pendingCount: number;
}

/** Operações registradas na auditoria do pedido (`OrderAuditOperation` no backend). */
export const ORDER_AUDIT_OPERATION_LABELS: Record<string, string> = {
  visualizacao_detalhes: "Detalhes visualizados",
  visualizacao_ingresso: "Ingresso visualizado",
  download_ingresso: "Ingresso baixado",
  visualizacao_comprovante: "Comprovante visualizado",
  solicitacao_cancelamento: "Cancelamento solicitado",
  solicitacao_reembolso: "Reembolso solicitado",
  aprovacao_reembolso: "Reembolso aprovado",
  recusa_reembolso: "Reembolso recusado",
  criacao_pedido: "Pedido criado",
  atualizacao_produtos: "Produtos atualizados",
  finalizacao_compra: "Compra finalizada",
};

/** `OrderAuditResult` no backend. */
export const ORDER_AUDIT_RESULT_LABELS: Record<string, string> = {
  sucesso: "Sucesso",
  falha: "Falha",
  negado: "Negado",
};

export const ORDER_AUDIT_RESULT_TONES: Record<string, string> = {
  sucesso: "border-green-500/40 bg-green-500/10 text-green-300",
  falha: "border-red-500/40 bg-red-500/10 text-red-300",
  negado: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
};

/** Uma entrada do histórico do pedido. */
export interface RefundAuditEntry {
  id: string;
  operation: string;
  result: string;
  /** ISO. */
  createdAt: string;
  actor?: {
    name: string;
    email?: string;
    /** "USER" ou "ADMIN" — o papel de quem executou. */
    role?: string;
  };
}

/** Resposta de `GET /refunds/:id`: o pedido e o histórico que embasa a decisão. */
export interface RefundRequestDetails {
  order: Order;
  history: RefundAuditEntry[];
}
