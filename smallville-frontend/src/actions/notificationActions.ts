"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { ActionResult } from "@/src/types/admin";
import {
  Notification,
  NotificationAudience,
  NotificationMetadata,
  NotificationType,
  NotificationsPage,
} from "@/src/types/notification";

/** Notificações do requisitante. */

interface RawNotification {
  _id: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  read?: boolean;
  readAt?: string;
  metadata?: NotificationMetadata;
  createdAt: string;
}

/** `GET /notifications` espalha a paginação no topo, como `/tickets`. */
interface RawNotificationsPage {
  items?: RawNotification[];
  total?: number;
  page?: number;
  limit?: number;
  unreadCount?: number;
}

function toNotification(raw: RawNotification): Notification {
  return {
    id: raw._id,
    audience: raw.audience,
    type: raw.type,
    title: raw.title,
    message: raw.message,
    read: !!raw.read,
    readAt: raw.readAt,
    createdAt: raw.createdAt,
    metadata: raw.metadata,
  };
}

/** Aceita os dois envelopes de paginação que o backend usa hoje. */
function toNotificationsPage(
  payload: RawNotification[] | RawNotificationsPage | null,
  page: number,
  limit: number,
): NotificationsPage {
  const raw = Array.isArray(payload) ? undefined : payload;

  /** `items` só é percorrido depois de confirmado que é um array. */
  const source = Array.isArray(payload) ? payload : raw?.items;
  const items = (Array.isArray(source) ? source : []).map(toNotification);

  return {
    items,
    total: raw?.total ?? items.length,
    page: raw?.page ?? page,
    limit: raw?.limit ?? limit,
    unreadCount:
      raw?.unreadCount ?? items.filter((item) => !item.read).length,
  };
}

export async function getMyNotifications(
  page = 1,
  limit = 10,
  onlyUnread = false,
): Promise<ActionResult<NotificationsPage>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  /** O FILTRO DO BACKEND CHAMA-SE `read`, NÃO `onlyUnread`. */
  if (onlyUnread) params.set("read", "false");

  const result = await apiRequest<RawNotification[] | RawNotificationsPage>(
    `/notifications?${params}`,
    { fallbackError: "Não foi possível carregar suas notificações." },
  );

  if (!result.success) return result;

  return { success: true, data: toNotificationsPage(result.data, page, limit) };
}

/** Contador do sino. */
export async function getUnreadNotificationsCount(): Promise<
  ActionResult<number>
> {
  const result = await apiRequest<
    { unreadCount?: number; count?: number } | number | null
  >("/notifications/unread-count", {
    fallbackError: "Não foi possível consultar as notificações.",
  });

  if (!result.success) return result;

  /** O backend responde `{ "unreadCount": 3 }`. */
  const payload = result.data;

  const count =
    typeof payload === "number"
      ? payload
      : (payload?.unreadCount ?? payload?.count ?? 0);

  return { success: true, data: Number.isFinite(count) ? count : 0 };
}

export async function markNotificationAsRead(
  id: string,
): Promise<ActionResult<null>> {
  const result = await apiRequest<null>(`/notifications/${id}/read`, {
    method: "PATCH",
    fallbackError: "Não foi possível marcar a notificação como lida.",
  });

  if (!result.success) return result;

  // As duas rotas mostram a MESMA caixa e precisam ser revalidadas juntas.
  revalidatePath("/notificacoes");
  revalidatePath("/admin/notifications");

  return { success: true, data: null };
}

export async function markAllNotificationsAsRead(): Promise<
  ActionResult<null>
> {
  const result = await apiRequest<{ updated?: number } | null>(
    "/notifications/read-all",
    {
      method: "PATCH",
      fallbackError: "Não foi possível marcar as notificações como lidas.",
    },
  );

  if (!result.success) return result;

  // As duas rotas mostram a MESMA caixa e precisam ser revalidadas juntas.
  revalidatePath("/notificacoes");
  revalidatePath("/admin/notifications");

  return { success: true, data: null };
}
