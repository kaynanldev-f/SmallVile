import { forwardRef, Module } from '@nestjs/common';
import { Movie, MovieSchema } from './schemas/movie.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { MoviesService } from './services/movies.service';
import { SessionsModule } from '../session/session.module';
import { MoviesController } from './controllers/movies.controller';
import { StorageModule } from 'src/storage/storage.module';
import { CinemasModule } from '../cinemas/cinema.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Movie.name,
        schema: MovieSchema,
      },
    ]),
    forwardRef(() => SessionsModule),
    forwardRef(() => CinemasModule),
    StorageModule,
  ],
  controllers: [MoviesController],
  providers: [MoviesService],
  exports: [MoviesService],
})
export class MoviesModule {}
