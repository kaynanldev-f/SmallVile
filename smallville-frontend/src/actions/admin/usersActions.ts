"use server";

import { apiRequest } from "@/src/lib/api";
import { ActionResult } from "@/src/types/admin";
import { AdminUser, AdminUsersPage } from "@/src/types/user";

/** Usuários cadastrados — área do administrador. */

/** Formato cru de um usuário na resposta do backend. */
interface RawUser {
  _id?: string;
  name?: string;
  surname?: string;
  email?: string;
  cpf?: string;
  phone?: string;
  birthDate?: string;
  city?: string;
  state?: string;
  gender?: string;
  createdAt?: string;
}

/** Envelope de `GET /users`: `meta` é IRMÃO de `data`, não filho. */
interface RawUsersEnvelope {
  data?: RawUser[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}

function toAdminUser(raw: RawUser): AdminUser {
  return {
    id: raw._id ?? "",
    name: raw.name ?? "",
    surname: raw.surname,
    email: raw.email ?? "",
    cpf: raw.cpf,
    phone: raw.phone,
    birthDate: raw.birthDate,
    city: raw.city,
    state: raw.state,
    gender: raw.gender,
    createdAt: raw.createdAt,
  };
}

export async function listUsers(
  page = 1,
  limit = 10,
): Promise<ActionResult<AdminUsersPage>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const result = await apiRequest<RawUsersEnvelope | RawUser[] | null>(
    `/users?${params}`,
    {
      keepEnvelope: true,
      fallbackError: "Não foi possível carregar os usuários.",
    },
  );

  if (!result.success) return result;

  // Aceita os dois formatos do backend: envelope `{ data, meta }` ou lista pura.
  const payload = result.data;
  const envelope = Array.isArray(payload) ? undefined : (payload ?? undefined);
  const source = Array.isArray(payload) ? payload : envelope?.data;
  const items = (Array.isArray(source) ? source : []).map(toAdminUser);

  const total = envelope?.meta?.total ?? items.length;
  const resolvedLimit = envelope?.meta?.limit ?? limit;

  return {
    success: true,
    data: {
      items,
      page: envelope?.meta?.page ?? page,
      limit: resolvedLimit,
      total,
      totalPages:
        envelope?.meta?.totalPages ??
        Math.max(1, Math.ceil(total / Math.max(resolvedLimit, 1))),
    },
  };
}
