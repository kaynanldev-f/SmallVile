"use server";

import { MovieDetailsResult } from "@/src/types/movie-types";

export async function getMovieDetailsById(
  id: string,
): Promise<MovieDetailsResult | null> {
  try {
    const response = await fetch(
      `${process.env.API_URL}/movies/${id}/details`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    console.log(response);
    if (!response.ok) {
      return null;
    }

    const movie: MovieDetailsResult = await response.json();

    return movie;
  } catch (error) {
    console.error("Erro ao buscar filme:", error);
    return null;
  }
}
