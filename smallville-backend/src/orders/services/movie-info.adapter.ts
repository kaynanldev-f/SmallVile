import { Injectable } from '@nestjs/common';
import { MoviesService } from 'src/movies/services/movies.service';
import { Classification } from 'src/movies/enums/classification.enum';
import { MovieInfoGateway } from './movie-info.gateway';

@Injectable()
export class MovieInfoAdapter implements MovieInfoGateway {
  constructor(private readonly moviesService: MoviesService) {}

  async getMinimumAge(movieId: string): Promise<number | null> {
    try {
      const movie = await this.moviesService.findOne(movieId);
      return movie.classification === Classification.LIVRE
        ? 0
        : Number(movie.classification);
    } catch {
      return null;
    }
  }
}
