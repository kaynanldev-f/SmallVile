import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PointsBalanceDocument = HydratedDocument<PointsBalance>;

/** Saldo consolidado do usuário. */
@Schema({
  collection: 'points_balances',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class PointsBalance {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({ required: true, default: 0, min: 0 })
  balance: number;

  @Prop({ required: true, default: 0, min: 0 })
  totalEarned: number;

  @Prop({ required: true, default: 0, min: 0 })
  totalRedeemed: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PointsBalanceSchema = SchemaFactory.createForClass(PointsBalance);
