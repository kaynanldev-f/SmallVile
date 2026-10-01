export const PAYMENT_MESSAGE = {
  PAYMENT_METHOD_REQUIRED: 'Selecione uma forma de pagamento para continuar.',
  PAYMENT_METHOD_UNAVAILABLE:
    'Pagamento com cartão estará disponível em breve. Utilize o PIX para concluir a compra.',
  CARDHOLDER_NAME_REQUIRED: 'O nome do titular é obrigatório',
  CARD_NUMBER_REQUIRED: 'O número do cartão é obrigatório',
  CARD_NUMBER_INVALID:
    'Número do cartão inválido. Informe entre 13 e 19 dígitos.',
  CARD_EXPIRY_REQUIRED: 'A data de validade é obrigatória',
  CARD_EXPIRED: 'Cartão vencido. Informe um cartão válido.',
  CARD_EXPIRY_INVALID: 'Data de validade inválida. Utilize o formato MM/AA.',
  CVV_REQUIRED: 'O CVV é obrigatório',
  CVV_INVALID: 'CVV inválido. Informe 3 ou 4 dígitos.',
  ORDER_EMPTY:
    'Não é possível acessar o pagamento sem ao menos um ingresso ou produto da bomboniere no pedido.',
  ORDER_NOT_FOUND: 'Pedido não encontrado.',
  PAYMENT_NOT_FOUND: 'Pagamento não encontrado.',
  SEATS_NO_LONGER_AVAILABLE:
    'Um ou mais assentos selecionados não estão mais disponíveis. Por favor, selecione novos assentos para continuar.',
  PAYMENT_NOT_AUTHORIZED:
    'Pagamento não autorizado. Escolha outra forma de pagamento ou tente novamente.',
  GATEWAY_COMMUNICATION_FAILURE:
    'Houve um erro ao comunicar com o gateway de pagamento. Tente novamente.',
  GATEWAY_TIMEOUT:
    'O processamento do pagamento demorou mais que o esperado. Tente novamente.',
  PIX_GENERATION_FAILED:
    'Não foi possível gerar o QR Code PIX. Tente novamente.',
  PIX_EXPIRED: 'O prazo para pagamento expirou. Sua compra foi cancelada.',
  CANCEL_CONFIRMATION_TEXT:
    'Ao cancelar esta compra, todos os dados informados serão perdidos. Deseja continuar?',
  PURCHASE_CANCELLED: 'Compra cancelada com sucesso.',
  PAYMENT_ALREADY_PROCESSED: 'Esta solicitação de pagamento já foi processada.',
  PAYMENT_IN_PROGRESS:
    'Já existe um pagamento em processamento para este pedido.',
  NO_PENDING_PAYMENT:
    'Este pedido não tem pagamento pendente. O usuário precisa escolher uma forma de pagamento antes.',
  PAYMENT_APPROVED_MOCK: 'Pagamento aprovado manualmente (simulação).',
  PAYMENT_REJECTED_BY_ADMIN: 'Pagamento recusado pelo administrador.',
  PAYMENT_REJECTION_DEFAULT_REASON:
    'Pagamento não identificado pelo administrador.',
} as const;
