import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TicketType } from '../enums/ticket-type.enum';
import { TicketStatus } from '../enums/ticket-status.enum';
import mongoose from 'mongoose';

export type TicketDocument = Ticket &
  Document & {
    createdAt?: Date;
    updatedAt?: Date;
  };

@Schema({
  collection: 'tickets',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class Ticket {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  })
  sessionId: mongoose.Types.ObjectId;

  // Ingressos emitidos pela compra do usuário pertencem a um pedido.
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false,
    index: true,
  })
  orderId?: mongoose.Types.ObjectId;

  // Identificador impresso no ingresso e usado na portaria. `sparse` porque
  // ingressos criados antes deste campo existir não possuem número.
  @Prop({ required: false, unique: true, sparse: true })
  ticketNumber?: string;

  // Conteúdo codificado no QR Code: número do ingresso + assinatura HMAC.
  // Guardamos o texto, não a imagem — a imagem é gerada sob demanda.
  @Prop({ required: false })
  qrCode?: string;

  @Prop({ required: true })
  seatNumber: string;

  @Prop({ type: String, required: true, enum: TicketType })
  type: TicketType;

  @Prop({
    type: String,
    enum: TicketStatus,
    default: TicketStatus.VALID,
    index: true,
  })
  status: TicketStatus;

  @Prop({ required: true })
  pricePaid: number;
}

export const TicketSchema = SchemaFactory.createForClass(Ticket);

TicketSchema.index({ userId: 1, createdAt: -1 });

TicketSchema.virtual('pricePaidFormatted').get(function (this: TicketDocument) {
  const valueInBRL = this.pricePaid / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInBRL);
});
