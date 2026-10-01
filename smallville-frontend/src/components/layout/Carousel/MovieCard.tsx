"use client";

import Link from "next/link";
import { ConfirmationNumber, Add } from "@mui/icons-material";

import Button from "../../ui/Button";
import MoviePoster from "../../ui/MoviePoster";
import { MovieCardProps } from "@/src/types/movie-types";
import { classificationColor, movieMetaLine } from "@/src/utils/movie";

/** Card usado nos carrosséis da Home. */
export default function MovieCard({ movie, highlight }: MovieCardProps) {
  return (
    <article className="group @container flex h-full flex-col overflow-hidden rounded-xl border border-grayScale-600 bg-gray-surface transition-all duration-300 hover:-translate-y-1 hover:border-red-cinema">
      <Link href={`/movies/${movie._id}`} className="relative block aspect-2/3">
        <MoviePoster
          src={movie.banner}
          alt={movie.title}
          sizes="(max-width: 640px) 60vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <span
          className={`absolute top-2 left-2 z-10 rounded px-1.5 py-0.5 text-[11px] font-black text-white ${classificationColor(
            movie.classification,
          )}`}
        >
          {movie.classification}
        </span>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 min-h-12 font-black text-white">
          {movie.title}
        </h3>

        <p className="line-clamp-1 text-xs text-grayScale-400">
          {movieMetaLine(movie.genres, movie.duration)}
        </p>

        {highlight && (
          <p className="line-clamp-1 text-xs font-bold text-red-cinema">
            {highlight}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2 @min-[15rem]:flex-row">
          <Link href={`/movies/${movie._id}`} className="min-w-0 flex-1">
            <Button
              size="sm"
              className="flex w-full items-center justify-center gap-1.5"
            >
              <ConfirmationNumber sx={{ fontSize: 16 }} />
              <span className="truncate">Ingressos</span>
            </Button>
          </Link>

          <Link href={`/movies/${movie._id}`} className="min-w-0 flex-1">
            <Button
              size="sm"
              variant="secondary"
              className="flex w-full items-center justify-center gap-1.5"
            >
              <Add sx={{ fontSize: 16 }} />
              <span className="truncate">Detalhes</span>
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
