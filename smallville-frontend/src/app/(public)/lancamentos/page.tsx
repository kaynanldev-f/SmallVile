import { getUpcomingReleases } from "@/src/actions/catalogActions";
import CatalogPage from "@/src/components/catalog/CatalogPage";
import CatalogMovieCard from "@/src/components/catalog/CatalogMovieCard";
import { parseBrDate } from "@/src/utils/date";

export const metadata = {
  title: "Lançamentos | Cineville",
};

function releaseHighlight(releaseDate: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const released = parseBrDate(releaseDate);

  if (Number.isNaN(released.getTime())) return "";

  if (released > today) return `Estreia em ${releaseDate}`;
  if (released.getTime() === today.getTime()) return "Estreia hoje";

  return `Estreou em ${releaseDate}`;
}

export default async function LancamentosPage() {
  const result = await getUpcomingReleases();

  return (
    <CatalogPage
      title="Lançamentos"
      subtitle="Estreias que já chegaram no último mês e as que ainda estão por vir."
    >
      {!result.success ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {result.error}
        </p>
      ) : !result.data.length ? (
        <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-12 text-center text-sm text-grayScale-400">
          Nenhum lançamento cadastrado no momento.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {result.data.map((movie) => (
            <CatalogMovieCard
              key={movie._id}
              movie={movie}
              highlight={releaseHighlight(movie.releaseDate)}
            />
          ))}
        </div>
      )}
    </CatalogPage>
  );
}
