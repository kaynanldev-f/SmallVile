import { PartialType } from '@nestjs/swagger';
import { CreateMovieWithAssetsDto } from './create-movie-with-assets';

export class UpdateMovieWithAssetsDto extends PartialType(
  CreateMovieWithAssetsDto,
) {}
