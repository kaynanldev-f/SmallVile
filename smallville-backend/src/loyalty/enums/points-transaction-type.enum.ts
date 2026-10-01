export enum PointsTransactionType {
  /** Pontos creditados por uma compra aprovada. */
  EARN = 'credito',
  /** Pontos gastos em um resgate. */
  REDEEM = 'resgate',
  /** Ajuste manual/administrativo, sempre com motivo registrado. */
  ADJUSTMENT = 'ajuste',
}
