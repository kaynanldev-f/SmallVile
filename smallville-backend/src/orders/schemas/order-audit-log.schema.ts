import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import {
  OrderAuditOperation,
  OrderAuditResult,
} from '../enums/order-audit-operation.enum';

export type OrderAuditLogDocument = HydratedDocument<OrderAuditLog>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class OrderAuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order', index: true })
  order?: Types.ObjectId;

  @Prop({ type: String, enum: OrderAuditOperation, required: true })
  operation: OrderAuditOperation;

  @Prop({ type: String, enum: OrderAuditResult, required: true })
  result: OrderAuditResult;

  @Prop({ required: true })
  sessionId: string;

  createdAt?: Date;
}

export const OrderAuditLogSchema = SchemaFactory.createForClass(OrderAuditLog);
