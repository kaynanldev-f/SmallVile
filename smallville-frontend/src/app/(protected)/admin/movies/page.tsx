import { listMovies } from "@/src/actions/admin/movieAdminActions";
import MoviesManager from "@/src/components/admin/movies/MoviesManager";

export default async function AdminMoviesPage() {
  const result = await listMovies();

  return (
    <MoviesManager
      movies={result.success ? result.data : []}
      loadError={result.success ? undefined : result.error}
    />
  );
}
