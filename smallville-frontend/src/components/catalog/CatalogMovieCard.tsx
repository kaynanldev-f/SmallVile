import Link from "next/link";
import MoviePoster from "@/src/components/ui/MoviePoster";
import { CatalogMovie } from "@/src/types/admin";
import { classificationColor, movieMetaLine } from "@/src/utils/movie";

interface CatalogMovieCardProps {
  movie: CatalogMovie;
  /** Linha de destaque abaixo do título (ex.: próxima sessão ou estreia). */
  highlight?: string;
}

export default function CatalogMovieCard({
  movie,
  highlight,
}: CatalogMovieCardProps) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-grayScale-600 bg-gray-surface transition-all duration-300 hover:-translate-y-1 hover:border-red-cinema">
      <Link href={`/movies/${movie._id}`} className="relative aspect-2/3 block">
        <MoviePoster
          src={movie.banner}
          alt={movie.title}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
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

        <Link
          href={`/movies/${movie._id}`}
          className="mt-auto inline-flex items-center justify-center rounded-md bg-button-primary px-4 py-2 text-sm font-bold text-white transition-all hover:scale-105"
        >
          Ver sessões
        </Link>
      </div>
    </article>
  );
}
