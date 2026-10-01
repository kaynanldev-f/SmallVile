/** Contrato do programa de pontos — espelhado do backend (smallville-backend). */

/** Espelha `PointsTransactionType` do backend. */
export const POINTS_TRANSACTION_TYPES = {
  /** Pontos ganhos em uma compra aprovada. */
  CREDITO: "credito",
  /** Pontos gastos em um resgate. Reservado — não emitido nesta etapa. */
  RESGATE: "resgate",
  /** Ajuste manual/administrativo, sempre com motivo registrado. */
  AJUSTE: "ajuste",
} as const;

export type PointsTransactionType =
  (typeof POINTS_TRANSACTION_TYPES)[keyof typeof POINTS_TRANSACTION_TYPES];

export const POINTS_TRANSACTION_LABELS: Record<PointsTransactionType, string> = {
  credito: "Crédito",
  resgate: "Resgate",
  ajuste: "Ajuste",
};

/** Regra de pontuação vigente, exibida na tela. */
export const POINTS_RULE = {
  /** Valor gasto, em centavos, que gera `points` pontos. */
  amountInCents: 500,
  points: 10,
} as const;

/** Quantos pontos um valor em centavos gera, pela regra vigente. */
export function pointsForAmount(amountInCents: number): number {
  if (!Number.isFinite(amountInCents) || amountInCents <= 0) return 0;

  return (
    Math.floor(amountInCents / POINTS_RULE.amountInCents) * POINTS_RULE.points
  );
}

export interface PointsBalance {
  /** Saldo disponível, calculado pelo backend a partir do extrato. */
  balance: number;
  /** Soma de tudo que já foi creditado. */
  totalEarned: number;
  /** Soma de tudo que já saiu. Hoje sempre 0: não existe resgate. */
  totalRedeemed: number;
  /** Regra usada pelo backend no momento da consulta. */
  rule: { amountInCents: number; points: number };
  /** ISO do último lançamento, quando houver. */
  lastEarnedAt?: string;
}

export interface PointsTransaction {
  id: string;
  type: PointsTransactionType;
  /** Assinado: positivo credita, negativo debita. */
  points: number;
  /** Saldo após o lançamento — auditoria. */
  balanceAfter: number;
  /** Texto do backend ("Compra #123"). */
  description: string;
  /** Pedido de origem, quando o lançamento vier de uma compra. */
  orderId?: string;
  /** Valor da compra que gerou os pontos, em centavos. */
  amountInCents?: number;
  /** ISO. */
  createdAt: string;
}

export interface PointsTransactionsPage {
  items: PointsTransaction[];
  total: number;
  page: number;
  limit: number;
}

/** Recompensas anunciadas como "Em breve". */
export const UPCOMING_REWARDS = [
  { icon: "🎟️", label: "Trocar por ingresso" },
  { icon: "🍿", label: "Trocar por combo" },
  { icon: "🥤", label: "Trocar por produtos" },
  { icon: "🎁", label: "Outras recompensas" },
] as const;
