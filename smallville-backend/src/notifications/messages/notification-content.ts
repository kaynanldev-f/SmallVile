import { NotificationType } from '../enums/notification-type.enum';
import { NotifyInput } from '../services/notifications.service';

const formatBRL = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format((cents ?? 0) / 100);

/** Texto de cada notificação em um lugar só. */
export const NOTIFICATION_CONTENT = {
  orderCreated: (orderId: string, totalAmount: number): NotifyInput => ({
    type: NotificationType.ORDER_CREATED,
    title: 'Compra realizada',
    message: `Compra realizada com sucesso no valor de ${formatBRL(
      totalAmount,
    )}. Seu pedido está em análise.`,
    metadata: { orderId },
  }),

  paymentApproved: (orderId: string, movieTitle?: string): NotifyInput => ({
    type: NotificationType.PAYMENT_APPROVED,
    title: 'Pagamento aprovado',
    message: movieTitle
      ? `Seu pagamento foi aprovado! Seu ingresso para ${movieTitle} está confirmado.`
      : 'Seu pagamento foi aprovado! Seu ingresso está confirmado.',
    metadata: { orderId },
  }),

  ticketAvailable: (orderId: string, ticketsCount: number): NotifyInput => ({
    type: NotificationType.TICKET_AVAILABLE,
    title: 'Ingresso disponível',
    message:
      ticketsCount > 1
        ? `Seus ${ticketsCount} ingressos estão disponíveis para visualização e download.`
        : 'Seu ingresso está disponível para visualização e download.',
    metadata: { orderId, ticketsCount },
  }),

  paymentRefused: (orderId: string, reason?: string): NotifyInput => ({
    type: NotificationType.PAYMENT_REFUSED,
    title: 'Pagamento recusado',
    message: reason
      ? `Seu pagamento foi recusado. Motivo: ${reason}`
      : 'Seu pagamento foi recusado.',
    metadata: { orderId, reason },
  }),

  orderCancelled: (orderId: string): NotifyInput => ({
    type: NotificationType.ORDER_CANCELLED,
    title: 'Pedido cancelado',
    message: 'Seu pedido foi cancelado.',
    metadata: { orderId },
  }),

  orderExpired: (orderId: string): NotifyInput => ({
    type: NotificationType.ORDER_EXPIRED,
    title: 'Pedido expirado',
    message:
      'O prazo para pagamento expirou e seu pedido foi cancelado. Os assentos voltaram para o mapa da sessão.',
    metadata: { orderId },
  }),

  refundRequested: (orderId: string, amount: number): NotifyInput => ({
    type: NotificationType.REFUND_REQUESTED,
    title: 'Reembolso em análise',
    message: `Recebemos sua solicitação de reembolso de ${formatBRL(
      amount,
    )}. Ela está em análise e você será avisado assim que houver uma decisão.`,
    metadata: { orderId, amount },
  }),

  refundApproved: (orderId: string, amount: number): NotifyInput => ({
    type: NotificationType.REFUND_APPROVED,
    title: 'Reembolso aprovado',
    // O texto fala em "aprovado", e não em "estornado": o sistema aprova a
    // solicitação, mas quem devolve o dinheiro é o meio de pagamento — e
    // essa integração ainda não existe.
    message: `Sua solicitação de reembolso de ${formatBRL(
      amount,
    )} foi aprovada. O valor será devolvido pelo meio de pagamento utilizado na compra.`,
    metadata: { orderId, amount },
  }),

  refundRejected: (orderId: string, reason: string): NotifyInput => ({
    type: NotificationType.REFUND_REJECTED,
    title: 'Reembolso recusado',
    message: `Sua solicitação de reembolso foi recusada. Motivo: ${reason}`,
    metadata: { orderId, reason },
  }),

  pointsEarned: (
    orderId: string,
    points: number,
    balance: number,
  ): NotifyInput => ({
    type: NotificationType.POINTS_EARNED,
    title: 'Pontos recebidos',
    message: `Você ganhou ${points} pontos com esta compra. Seu saldo agora é de ${balance} pontos.`,
    metadata: { orderId, points, balance },
  }),

  sessionUpdated: (
    sessionId: string,
    movieTitle: string,
    dateTime: string,
  ): NotifyInput => ({
    type: NotificationType.SESSION_UPDATED,
    title: 'Sessão alterada',
    message: `A sessão de ${movieTitle} que você comprou foi alterada. Novo horário: ${dateTime}.`,
    metadata: { sessionId, dateTime },
  }),

  sessionCancelled: (sessionId: string, movieTitle: string): NotifyInput => ({
    type: NotificationType.SESSION_CANCELLED,
    title: 'Sessão cancelada',
    message: `A sessão de ${movieTitle} que você comprou foi cancelada. Procure o cinema para reembolso ou remarcação.`,
    metadata: { sessionId },
  }),

  // ------------------------------- Admin -------------------------------

  paymentAwaitingReview: (
    orderId: string,
    amount: number,
    buyerName?: string,
  ): NotifyInput => ({
    type: NotificationType.PAYMENT_AWAITING_REVIEW,
    title: 'Pagamento aguardando análise',
    message: `Existe um pagamento de ${formatBRL(amount)}${
      buyerName ? ` de ${buyerName}` : ''
    } aguardando análise.`,
    metadata: { orderId, amount },
    // Um pedido gera um aviso: reenvios da mesma cobrança não repetem o item.
    dedupeKey: `pagamento-analise:${orderId}`,
  }),

  newSale: (
    orderId: string,
    amount: number,
    ticketsCount: number,
  ): NotifyInput => ({
    type: NotificationType.NEW_SALE,
    title: 'Nova venda realizada',
    message: `Venda de ${formatBRL(amount)} confirmada com ${ticketsCount} ingresso(s).`,
    metadata: { orderId, amount, ticketsCount },
    dedupeKey: `nova-venda:${orderId}`,
  }),

  adminPaymentRefused: (orderId: string, reason?: string): NotifyInput => ({
    type: NotificationType.ADMIN_PAYMENT_REFUSED,
    title: 'Pagamento recusado',
    message: reason
      ? `O pagamento do pedido foi recusado. Motivo: ${reason}`
      : 'O pagamento do pedido foi recusado.',
    metadata: { orderId, reason },
    dedupeKey: `pagamento-recusado:${orderId}`,
  }),

  refundRequestReceived: (
    orderId: string,
    amount: number,
    buyerName?: string,
  ): NotifyInput => ({
    type: NotificationType.ADMIN_REFUND_REQUESTED,
    title: 'Nova solicitação de reembolso',
    message: `Existe uma solicitação de reembolso de ${formatBRL(amount)}${
      buyerName ? ` de ${buyerName}` : ''
    } aguardando análise.`,
    // `refundId` é o próprio id do pedido: a solicitação vive dentro dele.
    // O painel usa este metadado para abrir os detalhes da solicitação.
    metadata: { orderId, refundId: orderId, amount },
    // Um pedido só pode ter uma solicitação aberta por vez, então a chave do
    // pedido já basta para o aviso não se repetir no sino.
    dedupeKey: `reembolso-solicitado:${orderId}`,
  }),

  sessionSoldOut: (sessionId: string, movieTitle: string): NotifyInput => ({
    type: NotificationType.SESSION_SOLD_OUT,
    title: 'Sessão lotada',
    message: `A sessão de ${movieTitle} vendeu o último assento disponível.`,
    metadata: { sessionId },
    dedupeKey: `sessao-lotada:${sessionId}`,
  }),

  stockLow: (
    productId: string,
    productName: string,
    quantity: number,
  ): NotifyInput => ({
    type: NotificationType.STOCK_LOW,
    title: 'Produto com estoque baixo',
    message: `${productName} está com apenas ${quantity} unidade(s) em estoque.`,
    metadata: { productId, quantity },
    dedupeKey: `estoque-baixo:${productId}`,
  }),

  stockOut: (productId: string, productName: string): NotifyInput => ({
    type: NotificationType.STOCK_OUT,
    title: 'Produto sem estoque',
    message: `${productName} está sem estoque e não pode mais ser vendido.`,
    metadata: { productId, quantity: 0 },
    dedupeKey: `estoque-esgotado:${productId}`,
  }),
};
