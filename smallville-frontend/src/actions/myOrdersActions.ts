"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { RawOrder, RawOrdersPage, toOrder } from "@/src/lib/orderMapper";
import { ActionResult } from "@/src/types/admin";
import type { Order, OrderStatus, OrdersPage } from "@/src/types/order";
import {
  PAYMENT_STATUSES,
  REJECTION_REASON_MAX_LENGTH,
  REJECTION_REASON_MIN_LENGTH,
} from "@/src/types/payments";
import { REFUND_REASON_MAX_LENGTH } from "@/src/types/refund";

/** Listagem de pedidos. */
async function loadOrders(
  page: number,
  limit: number,
  status?: OrderStatus,
): Promise<ActionResult<OrdersPage>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (status) params.set("status", status);

  const result = await apiRequest<RawOrdersPage>(`/orders?${params}`, {
    fallbackError: "Não foi possível carregar os pedidos.",
  });

  if (!result.success) return result;

  const raw = result.data;
  const items = (raw?.items ?? []).map(toOrder);

  return {
    success: true,
    data: {
      items,
      total: raw?.total ?? items.length,
      page: raw?.page ?? page,
      limit: raw?.limit ?? limit,
    },
  };
}

/** Pedidos do usuário logado. */
export async function getMyOrders(
  page = 1,
  limit = 10,
  status?: OrderStatus,
): Promise<ActionResult<OrdersPage>> {
  return loadOrders(page, limit, status);
}

/** Aprova o pagamento pendente de um pedido — só administrador. */
export async function approveOrderPayment(
  orderId: string,
): Promise<ActionResult<null>> {
  const result = await apiRequest<{ status?: string; failureReason?: string }>(
    `/payments/orders/${orderId}/mock-approve`,
    {
      method: "POST",
      fallbackError: "Não foi possível aprovar o pagamento.",
    },
  );

  if (!result.success) return result;

  if (result.data?.status === PAYMENT_STATUSES.REFUSED) {
    return {
      success: false,
      error:
        result.data.failureReason ??
        "O pagamento foi aprovado, mas o pedido não pôde ser finalizado.",
    };
  }

  revalidateOrderViews();

  return { success: true, data: null };
}

/** Recusa o pagamento pendente de um pedido — só administrador. */
export async function rejectOrderPayment(
  orderId: string,
  reason?: string,
): Promise<ActionResult<null>> {
  const trimmedReason = reason?.trim() ?? "";

  const body =
    trimmedReason.length >= REJECTION_REASON_MIN_LENGTH
      ? { reason: trimmedReason.slice(0, REJECTION_REASON_MAX_LENGTH) }
      : {};

  const result = await apiRequest<{ status?: string }>(
    `/payments/orders/${orderId}/reject`,
    {
      method: "POST",
      body,
      fallbackError:
        "Não foi possível recusar o pagamento. Tente novamente.",
    },
  );

  if (!result.success) return result;

  revalidateOrderViews();

  return { success: true, data: null };
}

/** Abre a solicitação de reembolso — o DONO do pedido. */
export async function requestOrderRefund(
  orderId: string,
  reason?: string,
): Promise<ActionResult<null>> {
  const trimmed = reason?.trim() ?? "";

  const body = trimmed
    ? { reason: trimmed.slice(0, REFUND_REASON_MAX_LENGTH) }
    : {};

  const result = await apiRequest<unknown>(
    `/orders/${orderId}/refund`,
    {
      method: "POST",
      body,
      fallbackError:
        "Não foi possível solicitar o reembolso. Tente novamente.",
    },
  );

  if (!result.success) return result;

  revalidateOrderViews();

  return { success: true, data: null };
}

/** As telas que mostram o desfecho de um pagamento ou de um reembolso. */
function revalidateOrderViews() {
  revalidatePath("/admin/orders");
  revalidatePath("/admin/tickets");
  revalidatePath("/admin/refunds");
  revalidatePath("/meus-pedidos");
}

/** Todos os pedidos do sistema — visão de administrador. */
export async function getAllOrders(
  page = 1,
  limit = 20,
  status?: OrderStatus,
): Promise<ActionResult<OrdersPage>> {
  return loadOrders(page, limit, status);
}

/** Detalhe de um pedido. A autorização é aplicada pelo backend. */
export async function getMyOrder(
  orderId: string,
): Promise<ActionResult<Order>> {
  const result = await apiRequest<RawOrder>(`/orders/${orderId}`, {
    fallbackError: "Pedido não encontrado.",
  });

  if (!result.success) return result;

  return { success: true, data: toOrder(result.data) };
}
