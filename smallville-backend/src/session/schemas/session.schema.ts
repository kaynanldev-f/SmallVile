import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';
import { SeatType } from '../enums/seat-type.enum';
import { RoomType } from '../enums/room-type.enum';
import { MovieLanguage } from 'src/movies/enums/movie-language.enum';

export type SessionDocument = Session & Document;

// Subdocumento pra controlar os assentos - não cria outra collection , serve apenas como base
@Schema({ _id: false })
export class Seat {
  @Prop({ required: true })
  seatNumber: string;

  @Prop({ type: String, required: true, enum: SeatType })
  type: SeatType;

  @Prop({ required: true, default: false })
  isOccupied: boolean;
}

@Schema({
  collection: 'sessions',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class Session {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Cinema', required: true })
  cinemaId: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Movie', required: true })
  movieId: string;

  @Prop({ required: true })
  movieTitle: string;

  @Prop({ required: true })
  roomName: string;

  @Prop({ type: String, required: true, enum: RoomType })
  roomType: RoomType;

  @Prop({ type: String, required: true, enum: MovieLanguage })
  language: MovieLanguage;

  @Prop({ required: true })
  dateTime: string;

  @Prop({ required: true, min: 0 })
  price: number;

  @Prop({ type: [Seat], required: true })
  seats: Seat[];

  // ------------------------- Controle de venda -------------------------
  // Configurado pelo painel "Controle de Vendas".

  /** Preço próprio da inteira, em centavos. Vence a tabela de regras. */
  @Prop({ required: false, min: 0 })
  priceFull?: number;

  /** Preço próprio da meia, em centavos. Vence a tabela de regras. */
  @Prop({ required: false, min: 0 })
  priceHalf?: number;

  /** Venda encerrada pelo administrador: nenhum pedido novo é aceito. */
  @Prop({ required: true, default: true })
  salesEnabled: boolean;

  @Prop({ required: false })
  salesStartAt?: Date;

  @Prop({ required: false })
  salesEndAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

SessionSchema.virtual('priceFormatted').get(function (this: SessionDocument) {
  const valueInBRL = this.price / 100;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valueInBRL);
});
