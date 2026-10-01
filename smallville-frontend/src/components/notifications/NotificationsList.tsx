"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/src/actions/notificationActions";
import { Notification } from "@/src/types/notification";
import { useQueryParams } from "@/src/hooks/useQueryParams";
import AdminPagination from "../admin/AdminPagination";
import NotificationItem from "./NotificationItem";

interface Props {
  notifications: Notification[];
  unreadCount: number;
  page: number;
  limit: number;
  total: number;
  onlyUnread: boolean;
  loadError?: string;
}

/** Lista completa de notificações. */
export default function NotificationsList({
  notifications,
  unreadCount,
  page,
  limit,
  total,
  onlyUnread,
  loadError,
}: Props) {
  const router = useRouter();
  const { update } = useQueryParams();
  const [isPending, startTransition] = useTransition();

  const [items, setItems] = useState(notifications);
  const [unread, setUnread] = useState(unreadCount);
  const [error, setError] = useState<string | null>(loadError ?? null);
  const [source, setSource] = useState(notifications);

  // A página é um server component: página e filtro trazem itens novos por si.
  if (source !== notifications) {
    setSource(notifications);
    setItems(notifications);
    setUnread(unreadCount);
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationAsRead(id);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      );

      setUnread((current) => Math.max(current - 1, 0));

      // O filtro "não lidas" deixa de conter o item marcado.
      if (onlyUnread) router.refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead();

      if (!result.success) {
        setError(result.error);
        return;
      }

      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <FilterChip
            label="Todas"
            active={!onlyUnread}
            onClick={() => update({ unread: null, page: null })}
          />

          <FilterChip
            label={unread > 0 ? `Não lidas (${unread})` : "Não lidas"}
            active={onlyUnread}
            onClick={() => update({ unread: "1", page: null })}
          />
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={isPending}
            className="cursor-pointer rounded-lg border border-grayScale-600 px-3 py-1.5 text-xs font-bold text-grayScale-300 transition-colors hover:border-red-cinema hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          onClick={() => setError(null)}
          className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {items.length === 0 ? (
        <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-10 text-center text-sm text-grayScale-400">
          {onlyUnread
            ? "Nenhuma notificação não lida."
            : "Você ainda não tem notificações."}
        </p>
      ) : (
        <ul className="divide-y divide-grayScale-600 overflow-hidden rounded-xl border border-grayScale-600 bg-gray-surface">
          {items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              isPending={isPending}
            />
          ))}
        </ul>
      )}

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        itemLabel="notificações"
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={clsx(
        "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "border-red-cinema bg-red-cinema text-white"
          : "border-grayScale-600 bg-gray-surface text-grayScale-300 hover:border-red-cinema hover:text-white",
      )}
    >
      {label}
    </button>
  );
}
