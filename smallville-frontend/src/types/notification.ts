/** Contrato de notificações — espelhado do backend (smallville-backend). */

export const NOTIFICATION_AUDIENCES = {
  /** Notificação de um usuário específico (dono do pedido). */
  USER: "usuario",
  /** Notificação operacional, replicada para cada administrador. */
  ADMIN: "administrador",
} as const;

export type NotificationAudience =
  (typeof NOTIFICATION_AUDIENCES)[keyof typeof NOTIFICATION_AUDIENCES];

/** Eventos que o sistema realmente emite. */
export const NOTIFICATION_TYPES = {
  /* ---------- Usuário ---------- */
  /** Pedido criado, pagamento ainda em análise. */
  PEDIDO_CRIADO: "pedido_criado",
  /** Administrador aprovou o pagamento (`POST /payments/orders/:id/mock-approve`). */
  PAGAMENTO_APROVADO: "pagamento_aprovado",
  /** Administrador recusou o pagamento (`POST /payments/orders/:id/reject`). */
  PAGAMENTO_RECUSADO: "pagamento_recusado",
  /** Ingressos emitidos por `fulfillPaidOrder`. */
  INGRESSO_DISPONIVEL: "ingresso_disponivel",
  /** Pedido cancelado pelo usuário. */
  PEDIDO_CANCELADO: "pedido_cancelado",
  /** Reserva expirada sem pagamento. */
  PEDIDO_EXPIRADO: "pedido_expirado",
  /** Pontos creditados após a aprovação do pagamento. */
  PONTOS_RECEBIDOS: "pontos_recebidos",
  /** Solicitação de reembolso aberta pelo usuário e recebida para análise. */
  REEMBOLSO_SOLICITADO: "reembolso_solicitado",
  /** Administrador aprovou o reembolso (`POST /refunds/:id/approve`). */
  REEMBOLSO_APROVADO: "reembolso_aprovado",
  /** Administrador recusou o reembolso (`POST /refunds/:id/reject`). */
  REEMBOLSO_RECUSADO: "reembolso_recusado",
  /** Sessão do ingresso teve sala, idioma ou horário alterados. */
  SESSAO_ALTERADA: "sessao_alterada",
  /** Sessão removida da grade. */
  SESSAO_CANCELADA: "sessao_cancelada",

  /* ---------- Administrador ---------- */
  /** Pedido novo entrou no sistema. */
  NOVA_VENDA: "nova_venda",
  /** Pagamento aguardando decisão do administrador. */
  PAGAMENTO_AGUARDANDO_ANALISE: "pagamento_aguardando_analise",
  /** O administrador recusou um pagamento — registro da própria operação. */
  ADMIN_PAGAMENTO_RECUSADO: "admin_pagamento_recusado",
  /** Nova solicitação de reembolso aguardando análise do administrador. */
  ADMIN_REEMBOLSO_SOLICITADO: "admin_reembolso_solicitado",
  /** Produto da bomboniere abaixo do limite mínimo de estoque. */
  ESTOQUE_BAIXO: "estoque_baixo",
  /** Produto da bomboniere zerado. */
  ESTOQUE_ESGOTADO: "estoque_esgotado",
  /** Sessão com todos os assentos ocupados. */
  SESSAO_LOTADA: "sessao_lotada",
} as const;

export type NotificationType =
  (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES];

/** Referências do evento. */
export interface NotificationMetadata {
  orderId?: string;
  /** Solicitação de reembolso. */
  refundId?: string;
  ticketId?: string;
  paymentId?: string;
  sessionId?: string;
  productId?: string;
  movieTitle?: string;
  /** Motivo da recusa, quando o administrador informou um. */
  reason?: string;
  /** Pontos creditados, quando o evento for de pontuação. */
  points?: number;
  /** Valor envolvido, em centavos. */
  amount?: number;
  /** Quantidade restante, nos alertas de estoque. */
  quantity?: number;
}

export interface Notification {
  id: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  /** ISO. Ausente enquanto não lida. */
  readAt?: string;
  /** ISO. */
  createdAt: string;
  metadata?: NotificationMetadata;
}

export interface NotificationsPage {
  items: Notification[];
  /** Total no servidor, não o tamanho da página. */
  total: number;
  page: number;
  limit: number;
  /** Não lidas no escopo do requisitante — vem do backend, nunca do cliente. */
  unreadCount: number;
}

/** Rótulo curto do evento, exibido como categoria dentro do item. */
export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  pedido_criado: "Compra realizada",
  pagamento_aprovado: "Pagamento aprovado",
  pagamento_recusado: "Pagamento recusado",
  ingresso_disponivel: "Ingresso disponível",
  pedido_cancelado: "Pedido cancelado",
  pedido_expirado: "Pedido expirado",
  pontos_recebidos: "Pontos creditados",
  reembolso_solicitado: "Reembolso em análise",
  reembolso_aprovado: "Reembolso aprovado",
  reembolso_recusado: "Reembolso recusado",
  sessao_alterada: "Sessão alterada",
  sessao_cancelada: "Sessão cancelada",
  nova_venda: "Nova venda",
  pagamento_aguardando_analise: "Pagamento pendente",
  admin_pagamento_recusado: "Pagamento recusado",
  admin_reembolso_solicitado: "Reembolso solicitado",
  estoque_baixo: "Estoque baixo",
  estoque_esgotado: "Sem estoque",
  sessao_lotada: "Sessão lotada",
};

/** Emoji do item na lista, como no layout aprovado. */
export const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
  pedido_criado: "🛒",
  pagamento_aprovado: "✅",
  pagamento_recusado: "⛔",
  ingresso_disponivel: "🎟️",
  pedido_cancelado: "🚫",
  pedido_expirado: "⌛",
  pontos_recebidos: "⭐",
  reembolso_solicitado: "🔍",
  reembolso_aprovado: "💸",
  reembolso_recusado: "🚷",
  sessao_alterada: "🕗",
  sessao_cancelada: "❌",
  nova_venda: "🛒",
  pagamento_aguardando_analise: "⏳",
  admin_pagamento_recusado: "⛔",
  admin_reembolso_solicitado: "💸",
  estoque_baixo: "📦",
  estoque_esgotado: "📭",
  sessao_lotada: "🔥",
};

/** Para onde o clique leva. */
export function notificationHref(notification: Notification): string | null {
  const meta = notification.metadata ?? {};

  if (notification.audience === NOTIFICATION_AUDIENCES.ADMIN) {
    switch (notification.type) {
      case NOTIFICATION_TYPES.NOVA_VENDA:
      case NOTIFICATION_TYPES.PAGAMENTO_AGUARDANDO_ANALISE:
      case NOTIFICATION_TYPES.ADMIN_PAGAMENTO_RECUSADO:
        return "/admin/orders";
      /** Leva direto para a análise da solicitação. */
      case NOTIFICATION_TYPES.ADMIN_REEMBOLSO_SOLICITADO:
        return meta.refundId ?? meta.orderId
          ? `/admin/refunds/${meta.refundId ?? meta.orderId}`
          : "/admin/refunds";
      case NOTIFICATION_TYPES.ESTOQUE_BAIXO:
      case NOTIFICATION_TYPES.ESTOQUE_ESGOTADO:
        return "/admin/stock";
      case NOTIFICATION_TYPES.SESSAO_LOTADA:
        return "/admin/sales-control";
      default:
        return "/admin";
    }
  }

  switch (notification.type) {
    case NOTIFICATION_TYPES.INGRESSO_DISPONIVEL:
      return "/meus-ingressos";
    case NOTIFICATION_TYPES.PONTOS_RECEBIDOS:
      return "/points";
    default:
      return meta.orderId ? "/meus-pedidos" : null;
  }
}
