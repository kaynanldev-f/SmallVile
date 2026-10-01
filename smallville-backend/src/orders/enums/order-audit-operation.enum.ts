export enum OrderAuditOperation {
  VIEW_DETAILS = 'visualizacao_detalhes',
  VIEW_TICKET = 'visualizacao_ingresso',
  DOWNLOAD_TICKET = 'download_ingresso',
  VIEW_RECEIPT = 'visualizacao_comprovante',
  REQUEST_CANCELLATION = 'solicitacao_cancelamento',
  REQUEST_REFUND = 'solicitacao_reembolso',
  APPROVE_REFUND = 'aprovacao_reembolso',
  REJECT_REFUND = 'recusa_reembolso',
  CREATE_ORDER = 'criacao_pedido',
  UPDATE_PRODUCTS = 'atualizacao_produtos',
  CHECKOUT = 'finalizacao_compra',
}

export enum OrderAuditResult {
  SUCCESS = 'sucesso',
  FAILURE = 'falha',
  DENIED = 'negado',
}
