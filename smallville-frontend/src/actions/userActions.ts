"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { apiRequest } from "@/src/lib/api";
import { getServerUser } from "@/src/lib/auth";
import { ActionResult } from "@/src/types/admin";

export interface UserProfile {
  _id: string;
  name: string;
  surname: string;
  cpf: string;
  birthDate: string;
  email: string;
  phone: string;
  cep: string;
  address: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  gender?: string;
  /** Instante ISO da criação da conta (timestamps do Mongoose). */
  createdAt?: string;
}

/** Campos que o usuário pode alterar no perfil (UpdateUserDto do backend). */
export interface UpdateProfileInput {
  name: string;
  surname: string;
  birthDate: string;
  phone: string;
  cep: string;
  address: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}

export async function getMyProfile(): Promise<ActionResult<UserProfile>> {
  const user = await getServerUser();

  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  return apiRequest<UserProfile>(`/users/${user.sub}`, {
    fallbackError: "Não foi possível carregar seu perfil.",
  });
}

export async function updateMyProfile(
  input: UpdateProfileInput,
): Promise<ActionResult<UserProfile>> {
  const user = await getServerUser();

  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  // Campos opcionais vazios são omitidos: o backend valida formato quando presentes.
  const body: Record<string, unknown> = { ...input };

  for (const key of ["number", "complement"] as const) {
    if (!body[key]) delete body[key];
  }

  const result = await apiRequest<UserProfile>(`/users/${user.sub}`, {
    method: "PATCH",
    body,
    fallbackError: "Não foi possível salvar as alterações.",
  });

  if (result.success) revalidatePath("/perfil");

  return result;
}

/** Exclui a conta do próprio usuário. */
export async function deleteMyAccount(): Promise<ActionResult<null>> {
  const user = await getServerUser();

  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const result = await apiRequest<null>(`/users/${user.sub}`, {
    method: "DELETE",
    fallbackError: "Não foi possível excluir sua conta.",
  });

  if (!result.success) return result;

  (await cookies()).delete("auth_token");

  return { success: true, data: null };
}
