import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ _id: false })
class PixData {
  @Prop()
  qrCode?: string;

  @Prop()
  copyPasteCode?: string;

  @Prop()
  expiresAt?: Date;
}

@Schema({
  collection: 'payments',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true, index: true })
  order: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({
    type: String,
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
    index: true,
  })
  status: PaymentStatus;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ default: 1 })
  installments: number;

  @Prop({ default: 0 })
  interestRate: number;

  @Prop()
  cardLast4?: string;

  @Prop({ type: PixData })
  pix?: PixData;

  @Prop()
  gatewayReference?: string;

  @Prop({ required: true, unique: true })
  idempotencyKey: string;

  @Prop()
  processedAt?: Date;

  @Prop()
  failureReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
