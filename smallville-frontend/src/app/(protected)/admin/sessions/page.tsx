import { listSessions } from "@/src/actions/admin/sessionAdminActions";
import { listCinemas } from "@/src/actions/admin/cinemaActions";
import { listMovies } from "@/src/actions/admin/movieAdminActions";
import SessionsManager from "@/src/components/admin/sessions/SessionsManager";

export default async function AdminSessionsPage() {
  const [sessions, cinemas, movies] = await Promise.all([
    listSessions(),
    listCinemas(),
    listMovies(),
  ]);

  const loadError = [sessions, cinemas, movies].find((r) => !r.success);

  return (
    <SessionsManager
      sessions={sessions.success ? sessions.data : []}
      cinemas={cinemas.success ? cinemas.data : []}
      movies={movies.success ? movies.data : []}
      loadError={loadError && !loadError.success ? loadError.error : undefined}
    />
  );
}
