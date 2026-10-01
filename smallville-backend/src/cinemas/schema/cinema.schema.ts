import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { CinemaStatus } from '../enums/cinema-status.enum';

export type CinemaDocument = Cinema & Document;

@Schema({
  collection: 'cinemas',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class Cinema extends Document {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({
    required: true,
    type: String,
    enum: CinemaStatus,
    default: CinemaStatus.ATIVO,
  })
  status: CinemaStatus;

  @Prop({
    type: [Types.ObjectId],
    ref: 'Movie',
    default: [],
  })
  movies: string[];
}

export const CinemaSchema = SchemaFactory.createForClass(Cinema);
