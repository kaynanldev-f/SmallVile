import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PointsTransactionType } from '../enums/points-transaction-type.enum';

export type PointsTransactionDocument = HydratedDocument<PointsTransaction>;

/** Extrato de pontos: uma linha por movimentação. */
@Schema({
  collection: 'points_transactions',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PointsTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: PointsTransactionType, required: true })
  type: PointsTransactionType;

  /** Positivo no crédito, negativo no resgate. */
  @Prop({ required: true })
  points: number;

  /** Saldo do usuário depois desta movimentação. */
  @Prop({ required: true, default: 0 })
  balanceAfter: number;

  @Prop({ type: Types.ObjectId, ref: 'Order', index: true })
  order?: Types.ObjectId;

  /** Valor da compra que originou o crédito, em centavos. */
  @Prop()
  amountInCents?: number;

  @Prop({ required: true })
  description: string;

  /** Garante a idempotência do crédito. */
  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PointsTransactionSchema =
  SchemaFactory.createForClass(PointsTransaction);

PointsTransactionSchema.index({ user: 1, createdAt: -1 });
