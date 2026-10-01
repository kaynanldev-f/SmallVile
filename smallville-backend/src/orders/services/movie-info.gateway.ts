export const MOVIE_INFO_GATEWAY = 'MOVIE_INFO_GATEWAY';

export interface MovieInfoGateway {
  getMinimumAge(movieId: string): Promise<number | null>;
}
