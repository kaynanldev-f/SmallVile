"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { ActionResult, AdminSession } from "@/src/types/admin";

export interface SessionInput {
  cinemaId: string;
  movieTitle: string;
  roomName: string;
  roomType: string;
  language: string;
  /** "DD/MM/AAAA HH:MM" */
  dateTime: string;
  /** Em centavos. */
  price: number;
}

const PATH = "/admin/sessions";

export async function listSessions(): Promise<ActionResult<AdminSession[]>> {
  const result = await apiRequest<AdminSession[]>("/sessions", {
    fallbackError: "Não foi possível carregar as sessões.",
  });

  if (!result.success) return result;

  return { success: true, data: result.data ?? [] };
}

export async function createSession(
  input: SessionInput,
): Promise<ActionResult<AdminSession>> {
  // `seats` é opcional: o backend gera o mapa de assentos padrão da sala.
  const result = await apiRequest<AdminSession>("/sessions", {
    method: "POST",
    body: input,
    fallbackError: "Não foi possível criar a sessão.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}

export async function updateSession(
  id: string,
  input: Partial<SessionInput>,
): Promise<ActionResult<AdminSession>> {
  const result = await apiRequest<AdminSession>(`/sessions/${id}`, {
    method: "PATCH",
    body: input,
    fallbackError: "Não foi possível atualizar a sessão.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}

export async function deleteSession(id: string): Promise<ActionResult<null>> {
  const result = await apiRequest<null>(`/sessions/${id}`, {
    method: "DELETE",
    fallbackError: "Não foi possível remover a sessão.",
  });

  if (result.success) revalidatePath(PATH);

  return result;
}
