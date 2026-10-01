import { listCinemas } from "@/src/actions/admin/cinemaActions";
import { listMovies } from "@/src/actions/admin/movieAdminActions";
import CinemasManager from "@/src/components/admin/cinemas/CinemasManager";

export default async function AdminCinemasPage() {
  // Os filmes vêm junto porque o cartaz de cada cinema é montado nesta tela.
  const [cinemas, movies] = await Promise.all([listCinemas(), listMovies()]);

  const loadError = [cinemas, movies].find((result) => !result.success);

  return (
    <CinemasManager
      cinemas={cinemas.success ? cinemas.data : []}
      movies={movies.success ? movies.data : []}
      loadError={loadError && !loadError.success ? loadError.error : undefined}
    />
  );
}
