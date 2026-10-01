/** Enums e formatos espelhados do backend (smallville-backend). */

export const MOVIE_GENRES = [
  "Ação",
  "Aventura",
  "Comédia",
  "Drama",
  "Terror",
  "Romance",
  "Ficção",
] as const;

export const CLASSIFICATIONS = ["L", "6", "10", "12", "14", "16", "18"] as const;

export const MOVIE_LANGUAGES = ["Dublado", "Legendado"] as const;

export const ROOM_TYPES = ["COMUM", "3D"] as const;

export const PRODUCT_CATEGORIES = ["BEBIDAS", "COMIDAS", "COMBOS"] as const;

export const PRODUCT_SIZES = ["Pequeno", "Médio", "Grande"] as const;

export const CINEMA_STATUSES = ["ATIVO", "INATIVO"] as const;

export const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export type MovieGenre = (typeof MOVIE_GENRES)[number];
export type Classification = (typeof CLASSIFICATIONS)[number];
export type MovieLanguage = (typeof MOVIE_LANGUAGES)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
export type ProductSize = (typeof PRODUCT_SIZES)[number];
export type CinemaStatus = (typeof CINEMA_STATUSES)[number];
export type BrazilState = (typeof BRAZIL_STATES)[number];

export interface Actor {
  name: string;
  imageUrl?: string;
}

export interface AdminMovie {
  _id: string;
  title: string;
  banner: string;
  synopsis: string;
  genres: MovieGenre[];
  classification: Classification;
  /** Em minutos. */
  duration: number;
  author: string;
  cast: Actor[];
  trailer?: string;
  /** "DD/MM/AAAA" */
  releaseDate: string;
  languages: MovieLanguage[];
}

export interface AdminCinema {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: BrazilState;
  status: CinemaStatus;
  movies?: string[];
}

export interface AdminSession {
  _id: string;
  cinemaId: string;
  movieId?: string;
  movieTitle: string;
  roomName: string;
  roomType: RoomType;
  language: MovieLanguage;
  /** "DD/MM/AAAA HH:MM" */
  dateTime: string;
  /** Em centavos. */
  price: number;
  seats?: { seatNumber: string; type: string; isOccupied: boolean }[];
}

export interface AdminProduct {
  _id: string;
  name: string;
  category: ProductCategory;
  size?: ProductSize;
  maxLimit: number;
  /** Estoque físico disponível. */
  quantity: number;
  /** Em centavos. */
  price: number;
  isAvailable: boolean;
  imageUrl: string;
}

/** As telas públicas consomem os mesmos modelos de domínio do admin. */
export type CatalogMovie = AdminMovie;
export type CatalogProduct = AdminProduct;

/** Resultado padrão das server actions de escrita. */
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };
