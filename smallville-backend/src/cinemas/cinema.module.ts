import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { MoviesModule } from '../movies/movies.module';
import { SessionsModule } from 'src/session/session.module';
import { Cinema, CinemaSchema } from './schema/cinema.schema';
import { CinemasController } from './controllers/cinema.controller';
import { CinemasService } from './services/cinema.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Cinema.name, schema: CinemaSchema }]),
    forwardRef(() => SessionsModule),
    forwardRef(() => MoviesModule),
  ],
  controllers: [CinemasController],
  providers: [CinemasService],
  exports: [CinemasService],
})
export class CinemasModule {}
