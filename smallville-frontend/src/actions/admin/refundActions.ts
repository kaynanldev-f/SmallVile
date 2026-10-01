"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { RawOrder, toOrder } from "@/src/lib/orderMapper";
import { ActionResult } from "@/src/types/admin";
import type {
  RefundAuditEntry,
  RefundRequestDetails,
  RefundStatus,
  RefundsPage,
} from "@/src/types/refund";
import { RESOLUTION_REASON_MAX_LENGTH } from "@/src/types/refund";

/** Análise das solicitações de reembolso — área do administrador. */

/** `GET /refunds` — paginação espalhada no topo, como `/orders`. */
interface RawRefundsPage {
  items?: RawOrder[];
  total?: number;
  page?: number;
  limit?: number;
  pendingCount?: number;
}

/** Uma linha da auditoria, com o usuário populado pelo backend. */
interface RawAuditEntry {
  _id?: string;
  operation?: string;
  result?: string;
  createdAt?: string;
  user?:
    | {
        _id?: string;
        name?: string;
        surname?: string;
        email?: string;
        role?: string;
      }
    | string;
}

interface RawRefundDetails {
  order?: RawOrder;
  history?: RawAuditEntry[];
}

function toAuditEntry(raw: RawAuditEntry, index: number): RefundAuditEntry {
  const actor = typeof raw.user === "object" && raw.user ? raw.user : undefined;

  return {
    id: raw._id ?? `${raw.operation ?? "log"}-${raw.createdAt ?? index}`,
    operation: raw.operation ?? "",
    result: raw.result ?? "",
    createdAt: raw.createdAt ?? "",
    actor: actor
      ? {
          name:
            [actor.name, actor.surname].filter(Boolean).join(" ") || "Usuário",
          email: actor.email,
          role: actor.role,
        }
      : undefined,
  };
}

/** Fila de análise, paginada pelo servidor. */
export async function listRefundRequests(
  page = 1,
  limit = 10,
  status?: RefundStatus,
): Promise<ActionResult<RefundsPage>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) params.set("status", status);

  const result = await apiRequest<RawRefundsPage | RawOrder[] | null>(
    `/refunds?${params}`,
    { fallbackError: "Não foi possível carregar as solicitações de reembolso." },
  );

  if (!result.success) return result;

  // `[]`, `null` e envelope inesperado viram página vazia, em vez de erro.
  const payload = result.data;
  const envelope = Array.isArray(payload) ? undefined : (payload ?? undefined);
  const source = Array.isArray(payload) ? payload : envelope?.items;
  const items = (Array.isArray(source) ? source : []).map(toOrder);

  return {
    success: true,
    data: {
      items,
      total: envelope?.total ?? items.length,
      page: envelope?.page ?? page,
      limit: envelope?.limit ?? limit,
      // Sem o campo do backend, contar a página aberta seria um número errado
      // assim que houvesse mais de uma página de pendências: melhor zero.
      pendingCount: envelope?.pendingCount ?? 0,
    },
  };
}

/** Detalhe da solicitação: o pedido completo e o histórico de auditoria. */
export async function getRefundRequest(
  orderId: string,
): Promise<ActionResult<RefundRequestDetails>> {
  const result = await apiRequest<RawRefundDetails | null>(
    `/refunds/${orderId}`,
    { fallbackError: "Solicitação de reembolso não encontrada." },
  );

  if (!result.success) return result;

  const raw = result.data;

  if (!raw?.order?._id) {
    return {
      success: false,
      error: "Solicitação de reembolso não encontrada.",
    };
  }

  return {
    success: true,
    data: {
      order: toOrder(raw.order),
      history: (raw.history ?? []).map(toAuditEntry),
    },
  };
}

/** Corpo do `resolutionReason`. */
function resolutionBody(reason?: string): { resolutionReason?: string } {
  const trimmed = reason?.trim() ?? "";

  return trimmed.length >= 3
    ? { resolutionReason: trimmed.slice(0, RESOLUTION_REASON_MAX_LENGTH) }
    : {};
}

/** Aprova a solicitação. */
export async function approveRefundRequest(
  orderId: string,
  resolutionReason?: string,
): Promise<ActionResult<null>> {
  const result = await apiRequest<unknown>(`/refunds/${orderId}/approve`, {
    method: "POST",
    body: resolutionBody(resolutionReason),
    fallbackError: "Não foi possível aprovar o reembolso. Tente novamente.",
  });

  if (!result.success) return result;

  revalidateRefundViews(orderId);

  return { success: true, data: null };
}

/** Recusa a solicitação. */
export async function rejectRefundRequest(
  orderId: string,
  resolutionReason: string,
): Promise<ActionResult<null>> {
  const body = resolutionBody(resolutionReason);

  // Sem motivo válido a requisição nem sai: o backend responderia 400, e o
  // erro chegaria como texto de validação em vez de orientação clara.
  if (!body.resolutionReason) {
    return {
      success: false,
      error: "Informe o motivo da recusa (ao menos 3 caracteres).",
    };
  }

  const result = await apiRequest<unknown>(`/refunds/${orderId}/reject`, {
    method: "POST",
    body,
    fallbackError: "Não foi possível recusar o reembolso. Tente novamente.",
  });

  if (!result.success) return result;

  revalidateRefundViews(orderId);

  return { success: true, data: null };
}

/** Telas revalidadas quando uma solicitação é decidida: fila, detalhe e pedidos. */
function revalidateRefundViews(orderId: string) {
  revalidatePath("/admin/refunds");
  revalidatePath(`/admin/refunds/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin/tickets");
  revalidatePath("/meus-pedidos");
  revalidatePath("/meus-ingressos");
  revalidatePath("/points");
}
