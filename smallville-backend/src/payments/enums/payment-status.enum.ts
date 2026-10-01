export enum PaymentStatus {
  PENDING = 'pendente',
  APPROVED = 'aprovado',
  REFUSED = 'recusado',
  EXPIRED = 'expirado',
}

export const FINAL_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.APPROVED,
  PaymentStatus.REFUSED,
  PaymentStatus.EXPIRED,
];
