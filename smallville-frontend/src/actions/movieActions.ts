"use server";

import {
  BackendCinemaForMovies,
  BackendMovie,
  BackendMovieDetails,
  CinemaSessionGroup,
  MovieDetailsResult,
  ShowtimeOption,
} from "../types/movie-types";
import { buildAuthHeaders } from "./http";
import { parseBrDate } from "../utils/date";

/** dateTime chega do backend como "DD/MM/AAAA HH:MM". */
function splitDateTime(dateTime: string): { date: string; time: string } {
  const [date = "", time = ""] = dateTime.split(" ");
  return { date, time };
}

export async function getAllMovies(): Promise<
  | { success: true; data: (BackendMovie & { _id: string })[] }
  | { success: false; error: string }
> {
  const headers = await buildAuthHeaders();

  try {
    const res = await fetch(`${process.env.API_URL}/movies`, {
      headers,
      cache: "no-store",
    });

    if (!res.ok) {
      return { success: false, error: "Erro ao buscar a lista de filmes." };
    }

    const json = await res.json();
    return { success: true, data: json.data ?? json };
  } catch (error) {
    return { success: false, error: "Erro na requisição dos filmes." };
  }
}

/**
 * Compara cidades tolerando acento e caixa: a cidade do perfil do usuário é
 * digitada no cadastro e a do cinema vem do cadastro de cinemas — "sao paulo"
 * e "São Paulo" precisam casar.
 */
function cityKey(city: string): string {
  return city
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

/**
 * Detalhes do filme com os cinemas e horários já filtrados.
 *
 * `city` é repassada ao backend como query param de `GET /movies/:id/details`,
 * que é quem faz o recorte — o mesmo contrato usado pelo filtro de dia. A
 * lista de cidades disponíveis sai de `GET /cinemas`, pelo relacionamento
 * `Cinema.movies` que já existe, e por isso não encolhe quando uma cidade é
 * escolhida.
 */
export async function getMovieWithSessions(
  movieId: string,
  city?: string | null,
): Promise<
  | { success: true; data: MovieDetailsResult }
  | { success: false; error: string }
> {
  const headers = await buildAuthHeaders();

  const detailsUrl = new URL(
    `${process.env.API_URL}/movies/${movieId}/details`,
  );

  if (city) detailsUrl.searchParams.set("city", city);

  const [res, cinemasRes] = await Promise.all([
    fetch(detailsUrl, { headers, cache: "no-store" }),
    fetch(`${process.env.API_URL}/cinemas`, {
      headers,
      cache: "no-store",
    }),
  ]);

  if (!res.ok) {
    return { success: false, error: "Filme não encontrado." };
  }

  const { data } = (await res.json()) as { data: BackendMovieDetails };

  const allCinemas: BackendCinemaForMovies[] = cinemasRes.ok
    ? ((await cinemasRes.json()).data ?? [])
    : [];

  const cinemaMap = new Map(
    allCinemas.map((cinema) => [String(cinema._id), cinema]),
  );

  // Cidades onde o filme está em cartaz, pelo relacionamento cinema → filmes.
  const cities = Array.from(
    new Map(
      allCinemas
        .filter((cinema) =>
          (cinema.movies ?? []).some((id) => String(id) === movieId),
        )
        .map((cinema) => [cityKey(cinema.city), cinema.city]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  // A cidade pedida pode vir do perfil com outra grafia; devolvemos a versão
  // canônica do cadastro de cinemas para o seletor exibir.
  const appliedCity = city
    ? (cities.find((option) => cityKey(option) === cityKey(city)) ?? city)
    : null;

  const groupsMap = new Map<string, CinemaSessionGroup>();

  data.sessions.forEach((session) => {
    const cinema = cinemaMap.get(String(session.cinemaId));

    // Rede de segurança do mesmo critério aplicado pelo backend: nenhum
    // cinema de outra cidade pode aparecer na grade.
    if (
      appliedCity &&
      (!cinema || cityKey(cinema.city) !== cityKey(appliedCity))
    ) {
      return;
    }

    const key = `${session.cinemaId}-${session.roomType}-${session.language}`;

    const { date, time } = splitDateTime(session.dateTime);

    const showtime: ShowtimeOption = {
      sessionId: session._id,
      date,
      time,
    };

    const existing = groupsMap.get(key);
    if (existing) {
      existing.showtimes.push(showtime);
      return;
    }

    groupsMap.set(key, {
      key,
      cinemaName: cinema?.name ?? "Cinema",
      address: cinema ? `${cinema.address} - ${cinema.city}` : "",
      city: cinema?.city ?? "",
      roomType: session.roomType,
      language: session.language,
      showtimes: [showtime],
    });
  });

  const groups = Array.from(groupsMap.values()).map((group) => ({
    ...group,
    showtimes: [...group.showtimes].sort(
      (a, b) =>
        parseBrDate(a.date).getTime() - parseBrDate(b.date).getTime() ||
        a.time.localeCompare(b.time),
    ),
  }));

  // Os dias vêm das sessões que sobraram, então o filtro de dia já nasce
  // coerente com a cidade selecionada.
  const dates = Array.from(
    new Set(
      groups.flatMap((group) =>
        group.showtimes.map((showtime) => showtime.date),
      ),
    ),
  )
    .filter(Boolean)
    .sort((a, b) => parseBrDate(a).getTime() - parseBrDate(b).getTime());

  return {
    success: true,
    data: {
      movie: {
        title: data.movie.title,
        banner: data.movie.banner,
        synopsis: data.movie.synopsis,
        director: data.movie.author,
        releaseDate: data.movie.releaseDate,
      },
      cast: data.movie.cast,
      groups,
      dates,
      cities,
      city: appliedCity,
    },
  };
}
