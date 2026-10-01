/** Eventos que geram notificação. */
export enum NotificationType {
  // Usuário
  ORDER_CREATED = 'pedido_criado',
  PAYMENT_APPROVED = 'pagamento_aprovado',
  PAYMENT_REFUSED = 'pagamento_recusado',
  TICKET_AVAILABLE = 'ingresso_disponivel',
  ORDER_CANCELLED = 'pedido_cancelado',
  ORDER_EXPIRED = 'pedido_expirado',
  REFUND_REQUESTED = 'reembolso_solicitado',
  REFUND_APPROVED = 'reembolso_aprovado',
  REFUND_REJECTED = 'reembolso_recusado',
  SESSION_UPDATED = 'sessao_alterada',
  SESSION_CANCELLED = 'sessao_cancelada',
  POINTS_EARNED = 'pontos_recebidos',

  // Administrador
  PAYMENT_AWAITING_REVIEW = 'pagamento_aguardando_analise',
  NEW_SALE = 'nova_venda',
  ADMIN_PAYMENT_REFUSED = 'admin_pagamento_recusado',
  ADMIN_REFUND_REQUESTED = 'admin_reembolso_solicitado',
  STOCK_LOW = 'estoque_baixo',
  STOCK_OUT = 'estoque_esgotado',
  SESSION_SOLD_OUT = 'sessao_lotada',
}
