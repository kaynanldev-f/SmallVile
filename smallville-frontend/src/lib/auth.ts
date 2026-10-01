import { cache } from "react";
import { cookies } from "next/headers";
import { jwtDecode } from "jwt-decode";
import { apiRequest } from "@/src/lib/api";
import { UserPayload } from "@/src/types";

/** Lê o usuário do cookie httpOnly em Server Components / layouts. */
export async function getServerUser(): Promise<UserPayload | null> {
  const token = (await cookies()).get("auth_token")?.value;

  if (!token) return null;

  try {
    const user = jwtDecode<UserPayload>(token);

    if (user.exp < Date.now() / 1000) return null;

    return user;
  } catch {
    return null;
  }
}

export async function isServerAdmin(): Promise<boolean> {
  const user = await getServerUser();

  return user?.role === "ADMIN";
}

/** O usuário da sessão com o nome ATUAL, para o cabeçalho e o menu lateral. */
export const getSessionUser = cache(
  async (): Promise<UserPayload | null> => {
    const user = await getServerUser();

    if (!user) return null;

    const profile = await apiRequest<{
      name?: string;
      surname?: string;
      email?: string;
      city?: string;
    }>(`/users/${user.sub}`, {
      fallbackError: "Não foi possível carregar o perfil.",
    });

    if (!profile.success || !profile.data) return user;

    return {
      ...user,
      name: profile.data.name || user.name,
      surname: profile.data.surname || user.surname,
      email: profile.data.email || user.email,
      city: profile.data.city || user.city,
    };
  },
);
