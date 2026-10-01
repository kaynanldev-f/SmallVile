"use client";

import Link from "next/link";
import LocalActivity from "@mui/icons-material/LocalActivity";
import PlayArrow from "@mui/icons-material/PlayArrow";
import { CatalogMovie } from "@/src/types/admin";
import { classificationColor, movieMetaLine } from "@/src/utils/movie";

interface HeroProps {
  /** Filme real do catálogo. Nada aqui é fixo no código. */
  movie: CatalogMovie;
  /** Linha de destaque, ex.: próxima sessão ou data de estreia. */
  highlight?: string;
}

const ACTION_BASE =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 sm:text-base";

/** Conteúdo de um destaque da Home. */
export default function Hero({ movie, highlight }: HeroProps) {
  const meta = movieMetaLine(movie.genres, movie.duration);

  return (
    <div className="flex min-h-screen w-full items-center">
      <div className="mx-auto w-full max-w-7xl px-5 py-24 sm:px-6 md:px-12 lg:px-16">
        <div className="max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            {movie.classification && (
              <span
                className={`inline-flex items-center rounded-md px-3 py-1 text-xs font-black sm:text-sm ${classificationColor(
                  movie.classification,
                )}`}
              >
                {movie.classification}
              </span>
            )}

            {meta && (
              <span className="text-xs font-semibold text-gray-200 sm:text-sm">
                {meta}
              </span>
            )}

            {highlight && (
              <span className="inline-flex items-center rounded-md bg-red-cinema px-3 py-1 text-xs font-semibold sm:text-sm">
                {highlight}
              </span>
            )}
          </div>

          <h1 className="mb-5 font-montserrat text-4xl font-bold uppercase tracking-wide sm:text-5xl md:text-6xl lg:text-7xl">
            {movie.title}
          </h1>

          {movie.synopsis && (
            <p className="mb-8 line-clamp-4 max-w-2xl text-sm leading-relaxed text-gray-200 sm:text-base md:text-lg">
              {movie.synopsis}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/movies/${movie._id}`}
              className={`${ACTION_BASE} w-full bg-button-primary hover:scale-105 sm:w-auto`}
            >
              <LocalActivity fontSize="small" />
              Comprar Ingresso
            </Link>

            {/* Só aparece quando o cadastro do filme tem trailer. */}
            {movie.trailer && (
              <a
                href={movie.trailer}
                target="_blank"
                rel="noopener noreferrer"
                className={`${ACTION_BASE} w-full border border-white bg-button-secondary hover:opacity-80 sm:w-auto`}
              >
                <PlayArrow fontSize="small" />
                Assistir Trailer
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
