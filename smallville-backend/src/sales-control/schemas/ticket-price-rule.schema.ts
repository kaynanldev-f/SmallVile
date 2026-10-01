import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TicketPriceRuleDocument = HydratedDocument<TicketPriceRule>;

/** Tabela de preços configurável pelo administrador. */
@Schema({
  collection: 'ticket_price_rules',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class TicketPriceRule {
  @Prop({ required: true })
  name: string;

  /** 0 = domingo ... 6 = sábado. `null` vale para todos os dias. */
  @Prop({ type: Number, default: null, min: 0, max: 6, index: true })
  weekday?: number | null;

  /** `null` vale para todos os cinemas da rede. */
  @Prop({ type: Types.ObjectId, ref: 'Cinema', default: null, index: true })
  cinema?: Types.ObjectId | null;

  /** Sempre em centavos, como todo valor monetário do sistema. */
  @Prop({ required: true, min: 0 })
  fullPrice: number;

  @Prop({ required: true, min: 0 })
  halfPrice: number;

  @Prop({ required: true, default: true, index: true })
  active: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TicketPriceRuleSchema =
  SchemaFactory.createForClass(TicketPriceRule);

// Uma regra por combinação dia + cinema: duas regras concorrentes para o
// mesmo caso tornariam o preço imprevisível.
TicketPriceRuleSchema.index({ weekday: 1, cinema: 1 }, { unique: true });
