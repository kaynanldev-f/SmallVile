/** Regra de pontuação do programa: a cada R$ 5,00 gastos, 10 pontos. */
export const POINTS_STEP_AMOUNT_CENTS = 500;
export const POINTS_PER_STEP = 10;

export const calculateEarnedPoints = (amountInCents: number): number => {
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) {
    return 0;
  }

  return Math.floor(amountInCents / POINTS_STEP_AMOUNT_CENTS) * POINTS_PER_STEP;
};

/** Chave que torna o crédito de um pedido único, por mais que ele repita. */
export const buildOrderEarnKey = (orderId: string): string =>
  `credito:pedido:${orderId}`;

/** Chave do estorno dos pontos de um pedido reembolsado. */
export const buildOrderRevokeKey = (orderId: string): string =>
  `estorno:pedido:${orderId}`;
