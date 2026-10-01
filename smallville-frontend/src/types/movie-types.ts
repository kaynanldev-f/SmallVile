import { CatalogMovie } from "./admin";
import { SalesStatus } from "./sales-control";

export interface BackendActor {
  name: string;
  imageUrl: string;
}

export interface BackendMovie {
  id: string;
  title: string;
  banner: string;
  synopsis: string;
  author: string;
  cast: BackendActor[];
  releaseDate: string;
  languages: string[];
}

export interface BackendSessionFull {
  _id: string;
  cinemaId: string;
  roomType: string;
  language: string;
  dateTime: string;
}

export interface BackendMovieDetails {
  movie: BackendMovie;
  sessions: BackendSessionFull[];
}

/** Cinema como `GET /cinemas` devolve (o schema desliga o virtual `id`). */
export interface BackendCinemaForMovies {
  _id: string;
  name: string;
  address: string;
  city: string;
  /** IDs dos filmes em cartaz neste cinema (`Cinema.movies` do backend). */
  movies?: string[];
}

export interface ShowtimeOption {
  sessionId: string;
  /** "DD/MM/AAAA", vindo de dateTime do backend. */
  date: string;
  time: string;
  /** Estado de venda da sessão, quando o backend o devolve. */
  salesStatus?: SalesStatus;
}

export interface CinemaSessionGroup {
  key: string;
  cinemaName: string;
  address: string;
  /** Cidade do cinema, como está cadastrada em `Cinema.city`. */
  city: string;
  roomType: string;
  language: string;
  showtimes: ShowtimeOption[];
}

export interface MovieDetailsResult {
  movie: {
    title: string;
    banner: string;
    synopsis: string;
    director: string;
    releaseDate: string;
  };
  cast: BackendActor[];
  groups: CinemaSessionGroup[];
  /** Dias com sessão disponíveis ("DD/MM/AAAA"), em ordem cronológica. */
  dates: string[];
  /**
   * Cidades que têm cinema com este filme em cartaz, em ordem alfabética.
   * Não depende da cidade filtrada, para o seletor não se esvaziar sozinho.
   */
  cities: string[];
  /** Cidade efetivamente aplicada no filtro; `null` quando nenhuma foi escolhida. */
  city: string | null;
}
/**
 * Os cards da Home usam o mesmo modelo de filme das páginas de catálogo (`/em-
 * cartaz`, `/lancamentos`), para que gênero, duração e classificação apareçam
 * iguais nos dois lugares.
 */
export interface MovieCardProps {
  movie: CatalogMovie;
  /** Linha de destaque abaixo do título (ex.: próxima sessão ou estreia). */
  highlight?: string;
}

export interface MovieCarouselProps {
  title: string;
  idSection?: string;
  movies: CatalogMovie[];
  /** Rota da listagem completa correspondente à seção. */
  seeAllHref?: string;
  /** Mensagem exibida quando não há filmes na seção. */
  emptyMessage?: string;
}
