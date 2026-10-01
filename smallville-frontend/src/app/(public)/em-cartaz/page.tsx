import { getNowPlayingMovies } from "@/src/actions/catalogActions";
import CatalogPage from "@/src/components/catalog/CatalogPage";
import CatalogMovieCard from "@/src/components/catalog/CatalogMovieCard";

export const metadata = {
  title: "Em Cartaz | Cineville",
};

export default async function EmCartazPage() {
  const result = await getNowPlayingMovies();

  return (
    <CatalogPage
      title="Em Cartaz"
      subtitle="Filmes com sessões abertas nos nossos cinemas."
    >
      {!result.success ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {result.error}
        </p>
      ) : !result.data.length ? (
        <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-12 text-center text-sm text-grayScale-400">
          Nenhum filme com sessões disponíveis no momento.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {result.data.map((movie) => (
            <CatalogMovieCard
              key={movie._id}
              movie={movie}
              highlight={
                movie.nextSession
                  ? `Próxima sessão: ${movie.nextSession}`
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </CatalogPage>
  );
}
