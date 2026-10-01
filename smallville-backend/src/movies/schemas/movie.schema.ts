import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { Classification } from '../enums/classification.enum';
import { MovieLanguage } from '../enums/movie-language.enum';
import { MovieGenres } from '../enums/movie-genres.enum';
import { ActorDto } from '../dtos/actor.dto';

export type MovieDocument = Movie & Document;

@Schema({
  collection: 'movies',
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
  id: false,
})
export class Movie extends Document {
  @Prop({ required: true, unique: true })
  title: string;

  @Prop({ required: true })
  banner: string;

  @Prop({ required: true, maxlength: 1000 })
  synopsis: string;

  @Prop({
    type: [String],
    enum: MovieGenres,
    required: true,
  })
  genres: MovieGenres[];

  @Prop({
    type: String,
    required: true,
    enum: Classification,
  })
  classification: Classification;

  @Prop({
    required: true,
    min: 1,
  })
  duration: number;

  @Prop({ required: true })
  author: string;

  @Prop({ required: true })
  cast: ActorDto[];

  @Prop()
  trailer?: string;

  @Prop({ required: true })
  releaseDate: string;

  @Prop({
    type: [String],
    enum: MovieLanguage,
    required: true,
  })
  languages: MovieLanguage[];
}

export const MovieSchema = SchemaFactory.createForClass(Movie);
