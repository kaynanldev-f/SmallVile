export enum PaymentMethod {
  PIX = 'pix',
  CREDIT_CARD = 'cartao_credito',
  DEBIT_CARD = 'cartao_debito',
}

export const CARD_PAYMENT_METHODS: PaymentMethod[] = [
  PaymentMethod.CREDIT_CARD,
  PaymentMethod.DEBIT_CARD,
];

/** Formas de pagamento que o backend realmente processa hoje. */
export const AVAILABLE_PAYMENT_METHODS: PaymentMethod[] = [PaymentMethod.PIX];

export const isPaymentMethodAvailable = (method: PaymentMethod): boolean =>
  AVAILABLE_PAYMENT_METHODS.includes(method);

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  [PaymentMethod.PIX]: 'PIX',
  [PaymentMethod.CREDIT_CARD]: 'Cartão de crédito',
  [PaymentMethod.DEBIT_CARD]: 'Cartão de débito',
};
