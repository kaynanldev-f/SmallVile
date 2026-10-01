"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { ActionResult, AdminCinema } from "@/src/types/admin";

export interface CinemaInput {
  name: string;
  address: string;
  city: string;
  state: string;
  status: string;
}

const PATH = "/admin/cinemas";

export async function listCinemas(): Promise<ActionResult<AdminCinema[]>> {
  const result = await apiRequest<AdminCinema[]>("/cinemas", {
    fallbackError: "Não foi possível carregar os cinemas.",
  });

  if (!result.success) return result;

  return { success: true, data: result.data ?? [] };
}

export async function createCinema(
  input: CinemaInput,
): Promise<ActionResult<AdminCinema>> {
  const result = await apiRequest<AdminCinema>("/cinemas", {
    method: "POST",
    body: input,
    fallbackError: "Não foi possível cadastrar o cinema.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}

export async function updateCinema(
  id: string,
  input: Partial<CinemaInput>,
): Promise<ActionResult<AdminCinema>> {
  const result = await apiRequest<AdminCinema>(`/cinemas/${id}`, {
    method: "PATCH",
    body: input,
    fallbackError: "Não foi possível atualizar o cinema.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}

/** Sincroniza o cartaz de um cinema com a seleção da tela. */
export async function setCinemaMovies(
  cinemaId: string,
  movieIds: string[],
): Promise<ActionResult<null>> {
  const current = await apiRequest<AdminCinema>(`/cinemas/${cinemaId}`, {
    fallbackError: "Não foi possível carregar o cartaz do cinema.",
  });

  if (!current.success) return current;

  const attached = new Set((current.data?.movies ?? []).map(String));
  const selected = new Set(movieIds);

  const changes = [
    ...movieIds
      .filter((id) => !attached.has(id))
      .map((id) => ({ id, method: "POST" })),
    ...[...attached]
      .filter((id) => !selected.has(id))
      .map((id) => ({ id, method: "DELETE" })),
  ];

  // Em série: são poucas chamadas e a primeira falha precisa interromper o
  // resto, senão o cartaz fica meio aplicado sem o admin saber onde parou.
  for (const change of changes) {
    const result = await apiRequest<AdminCinema>(
      `/cinemas/${cinemaId}/movies/${change.id}`,
      {
        method: change.method,
        fallbackError: "Não foi possível atualizar o cartaz do cinema.",
      },
    );

    if (!result.success) return result;
  }

  revalidatePath(PATH);
  revalidatePath("/admin/sessions");

  return { success: true, data: null };
}

export async function deleteCinema(id: string): Promise<ActionResult<null>> {
  const result = await apiRequest<null>(`/cinemas/${id}`, {
    method: "DELETE",
    fallbackError: "Não foi possível remover o cinema.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}
