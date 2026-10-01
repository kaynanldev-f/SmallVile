import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationAudience } from '../enums/notification-audience.enum';
import { NotificationType } from '../enums/notification-type.enum';

export type NotificationDocument = HydratedDocument<Notification>;

/** Notificação sempre pertence a um usuário. */
@Schema({
  collection: 'notifications',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationAudience,
    required: true,
    index: true,
  })
  audience: NotificationAudience;

  @Prop({ type: String, enum: NotificationType, required: true })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false, index: true })
  read: boolean;

  @Prop()
  readAt?: Date;

  /**
   * Dados do evento que a tela usa para navegar (id do pedido, do ingresso,
   * do produto).
   */
  @Prop({ type: Object, default: {} })
  metadata?: Record<string, unknown>;

  /** Chave de deduplicação dos alertas recorrentes. */
  @Prop({ index: true })
  dedupeKey?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });
