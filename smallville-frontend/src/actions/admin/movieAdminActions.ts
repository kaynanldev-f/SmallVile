"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { ActionResult, AdminMovie } from "@/src/types/admin";

const PATH = "/admin/movies";

export interface MovieInput {
  title: string;
  synopsis: string;
  genres: string[];
  classification: string;
  /** Em minutos. */
  duration: number;
  author: string;
  trailer?: string;
  /** "DD/MM/AAAA" */
  releaseDate: string;
  languages: string[];
  /** Nomes do elenco. Cada ator precisa de uma foto na mesma ordem. */
  castNames: string[];
}

/** As rotas de filme são multipart/form-data. */
function buildMovieFormData(
  input: Partial<MovieInput>,
  banner: File | null | undefined,
  actorsPhotos: File[],
): FormData {
  const form = new FormData();

  if (input.title) form.append("title", input.title);
  if (input.synopsis) form.append("synopsis", input.synopsis);
  if (input.genres?.length) form.append("genres", input.genres.join(","));
  if (input.classification) form.append("classification", input.classification);
  if (input.duration) form.append("duration", String(input.duration));
  if (input.author) form.append("author", input.author);
  if (input.trailer) form.append("trailer", input.trailer);
  if (input.releaseDate) form.append("releaseDate", input.releaseDate);
  if (input.languages?.length)
    form.append("languages", input.languages.join(","));

  if (input.castNames?.length) {
    form.append(
      "cast",
      JSON.stringify(input.castNames.map((name) => ({ name }))),
    );

    actorsPhotos.forEach((photo) => form.append("actorsPhotos", photo));
  }

  if (banner && banner.size > 0) form.append("banner", banner);

  return form;
}

export async function listMovies(): Promise<ActionResult<AdminMovie[]>> {
  const result = await apiRequest<AdminMovie[]>("/movies", {
    fallbackError: "Não foi possível carregar os filmes.",
  });

  if (!result.success) return result;

  return { success: true, data: result.data ?? [] };
}

export async function createMovie(
  input: MovieInput,
  banner: File | null,
  actorsPhotos: File[],
): Promise<ActionResult<AdminMovie>> {
  if (!banner || banner.size === 0) {
    return { success: false, error: "O banner do filme é obrigatório." };
  }

  if (!input.castNames.length) {
    return { success: false, error: "Informe pelo menos um ator no elenco." };
  }

  if (input.castNames.length !== actorsPhotos.length) {
    return {
      success: false,
      error: `Cada ator precisa de uma foto: ${input.castNames.length} ator(es) e ${actorsPhotos.length} foto(s).`,
    };
  }

  const result = await apiRequest<AdminMovie>("/movies", {
    method: "POST",
    formData: buildMovieFormData(input, banner, actorsPhotos),
    fallbackError: "Não foi possível cadastrar o filme.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}

/**
 * O elenco só é enviado quando `castNames` vier preenchido — assim uma edição
 * de título ou sinopse não exige reenviar todas as fotos dos atores.
 */
export async function updateMovie(
  id: string,
  input: Partial<MovieInput>,
  banner?: File | null,
  actorsPhotos: File[] = [],
): Promise<ActionResult<AdminMovie>> {
  if (input.castNames?.length && input.castNames.length !== actorsPhotos.length) {
    return {
      success: false,
      error: `Para trocar o elenco, envie uma foto por ator: ${input.castNames.length} ator(es) e ${actorsPhotos.length} foto(s).`,
    };
  }

  const result = await apiRequest<AdminMovie>(`/movies/${id}`, {
    method: "PATCH",
    formData: buildMovieFormData(input, banner, actorsPhotos),
    fallbackError: "Não foi possível atualizar o filme.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}

export async function deleteMovie(id: string): Promise<ActionResult<null>> {
  const result = await apiRequest<null>(`/movies/${id}`, {
    method: "DELETE",
    fallbackError: "Não foi possível remover o filme.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}
