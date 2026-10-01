import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { OrderStatus } from '../enums/order-status.enum';
import { TicketType } from 'src/tickets/enums/ticket-type.enum';

export type OrderDocument = HydratedDocument<Order>;

@Schema({ _id: false })
class CancellationInfo {
  @Prop()
  requestedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId;

  @Prop()
  reason?: string;
}

/** Ciclo de vida de uma solicitação de reembolso. */
@Schema({ _id: false })
class RefundInfo {
  @Prop()
  requestedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  requestedBy?: Types.ObjectId;

  /** Motivo informado pelo usuário ao abrir a solicitação. */
  @Prop()
  reason?: string;

  /** Valor integral do pedido congelado no momento da solicitação. */
  @Prop({ min: 0 })
  amount?: number;

  /**
   * Status do pedido quando a solicitação foi aberta (`PAYMENT_APPROVED` ou
   * `ORDER_CANCELLED`).
   */
  @Prop({ type: String, enum: OrderStatus })
  previousStatus?: OrderStatus;

  @Prop()
  resolvedAt?: Date;

  /** Administrador que aprovou ou recusou a solicitação. */
  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  /** Justificativa da decisão administrativa. Obrigatória na recusa. */
  @Prop()
  resolutionReason?: string;
}

// Item de produto (concessões: pipoca, bebida, combo, etc.) incluído no
// pedido, além dos ingressos da sessão.
@Schema({ _id: false })
class OrderSeatItem {
  @Prop({ required: true })
  seatNumber: string;

  @Prop({ type: String, required: true, enum: TicketType })
  type: TicketType;

  @Prop({ required: true, min: 0 })
  pricePaid: number;
}

@Schema({ _id: false })
class OrderProductItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  product: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  pricePaid: number;
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Session', required: true })
  session: Types.ObjectId;

  @Prop({ type: [OrderSeatItem], required: true })
  seats: OrderSeatItem[];

  @Prop({ type: [Types.ObjectId], ref: 'Ticket', default: [] })
  tickets: Types.ObjectId[];

  @Prop({ type: [OrderProductItem], default: [] })
  products: OrderProductItem[];

  @Prop({ required: true, min: 0, default: 0 })
  subtotalAmount: number;

  @Prop({ default: 0, min: 0 })
  discountAmount: number;

  @Prop()
  couponCode?: string;

  @Prop({ default: 0, min: 0 })
  loyaltyPointsUsed: number;

  @Prop({ required: true, min: 0, default: 0 })
  totalAmount: number;

  @Prop()
  reservationExpiresAt?: Date;

  @Prop({
    type: String,
    enum: OrderStatus,
    default: OrderStatus.ORDER_PLACED,
    index: true,
  })
  status: OrderStatus;

  @Prop({ default: false })
  paymentApproved: boolean;

  @Prop()
  ticketGeneratedAt?: Date;

  @Prop()
  cancellationDeadline?: Date;

  @Prop()
  receiptUrl?: string;

  // Ingresso em PDF gerado na finalização da compra.
  @Prop()
  ticketPdfUrl?: string;

  // Rastreio do e-mail de confirmação: a compra é válida mesmo quando o SMTP
  // falha, então o resultado do envio fica registrado no pedido para que o
  // frontend possa mostrar "e-mail enviado" ou oferecer o reenvio.
  @Prop()
  confirmationEmailSentAt?: Date;

  @Prop()
  confirmationEmailError?: string;

  /**
   * Marca que assentos, estoque e ingressos deste pedido já foram
   * devolvidos.
   */
  @Prop()
  reservationReleasedAt?: Date;

  @Prop({ type: CancellationInfo })
  cancellation?: CancellationInfo;

  @Prop({ type: RefundInfo })
  refund?: RefundInfo;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

OrderSchema.index({ createdAt: -1 });
