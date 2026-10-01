"use server";

import { apiRequest } from "@/src/lib/api";
import {
  ActionResult,
  AdminSession,
  CatalogMovie,
  CatalogProduct,
  ProductCategory,
} from "@/src/types/admin";
import { formatBrDateTime, parseBrDate, parseBrDateTime } from "@/src/utils/date";

/**
 * Janela usada para "Lançamentos": filmes que estreiam no futuro ou que
 * estrearam nos últimos 30 dias.
 */
const RECENT_RELEASE_WINDOW_DAYS = 30;

export interface NowPlayingMovie extends CatalogMovie {
  /** Quantidade de sessões futuras. */
  sessionCount: number;
  /** Próxima sessão, no formato "DD/MM/AAAA HH:MM". */
  nextSession?: string;
}

async function fetchMovies(): Promise<ActionResult<CatalogMovie[]>> {
  const result = await apiRequest<CatalogMovie[]>("/movies", {
    fallbackError: "Não foi possível carregar os filmes.",
  });

  if (!result.success) return result;

  return { success: true, data: result.data ?? [] };
}

/** "Em Cartaz": filmes com pelo menos uma sessão ainda por acontecer. */
export async function getNowPlayingMovies(): Promise<
  ActionResult<NowPlayingMovie[]>
> {
  const [movies, sessions] = await Promise.all([
    fetchMovies(),
    apiRequest<AdminSession[]>("/sessions", {
      fallbackError: "Não foi possível carregar as sessões.",
    }),
  ]);

  if (!movies.success) return movies;
  if (!sessions.success) return sessions;

  const now = new Date();

  // Agrupa sessões futuras por filme. O schema de sessão guarda movieId e
  // movieTitle; usamos o id quando existe e caímos no título como reserva.
  const byMovie = new Map<string, Date[]>();

  for (const session of sessions.data ?? []) {
    const when = parseBrDateTime(session.dateTime);

    if (!when || when < now) continue;

    for (const key of [session.movieId, session.movieTitle]) {
      if (!key) continue;

      const current = byMovie.get(key) ?? [];
      current.push(when);
      byMovie.set(key, current);
    }
  }

  const nowPlaying: NowPlayingMovie[] = [];

  for (const movie of movies.data) {
    const upcoming = byMovie.get(movie._id) ?? byMovie.get(movie.title) ?? [];

    if (!upcoming.length) continue;

    const next = upcoming.reduce((earliest, current) =>
      current < earliest ? current : earliest,
    );

    nowPlaying.push({
      ...movie,
      sessionCount: upcoming.length,
      nextSession: formatBrDateTime(next),
    });
  }

  nowPlaying.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  return { success: true, data: nowPlaying };
}

/**
 * "Lançamentos": estreias futuras primeiro, seguidas das que aconteceram
 * dentro da janela recente.
 */
export async function getUpcomingReleases(): Promise<
  ActionResult<CatalogMovie[]>
> {
  const movies = await fetchMovies();

  if (!movies.success) return movies;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - RECENT_RELEASE_WINDOW_DAYS);

  const releases = movies.data
    .map((movie) => ({ movie, releasedAt: parseBrDate(movie.releaseDate) }))
    .filter(
      ({ releasedAt }) =>
        !Number.isNaN(releasedAt.getTime()) && releasedAt >= windowStart,
    )
    .sort((a, b) => b.releasedAt.getTime() - a.releasedAt.getTime())
    .map(({ movie }) => movie);

  return { success: true, data: releases };
}

export type BomboniereCatalog = Record<ProductCategory, CatalogProduct[]>;

/** Catálogo da bomboniere agrupado por categoria. Rota pública: o visitante
 * deslogado recebe os mesmos produtos. */
export async function getBomboniereCatalog(): Promise<
  ActionResult<BomboniereCatalog>
> {
  return apiRequest<BomboniereCatalog>("/products/availables?grouped=true", {
    fallbackError: "Não foi possível carregar a bomboniere.",
  });
}
