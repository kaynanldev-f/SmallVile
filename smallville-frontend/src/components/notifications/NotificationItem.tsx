"use client";

import Link from "next/link";
import clsx from "clsx";
import DoneIcon from "@mui/icons-material/DoneOutlined";
import {
  Notification,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_TYPE_LABELS,
  notificationHref,
} from "@/src/types/notification";
import {
  formatFullDateTime,
  formatRelativeTime,
} from "@/src/utils/relative-time";

interface Props {
  notification: Notification;
  /** Ausente quando a lista não permite marcar (ex.: já lidas). */
  onMarkRead?: (id: string) => void;
  /** Fecha o painel ao navegar. */
  onNavigate?: () => void;
  isPending?: boolean;
}

/** Um item da lista de notificações. */
export default function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
  isPending,
}: Props) {
  const href = notificationHref(notification);
  const icon = NOTIFICATION_TYPE_ICONS[notification.type] ?? "🔔";
  const label = NOTIFICATION_TYPE_LABELS[notification.type] ?? "Notificação";

  const body = (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 text-lg leading-none">
        {icon}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p
            className={clsx(
              "text-sm",
              notification.read
                ? "text-grayScale-300"
                : "font-bold text-grayScale-200",
            )}
          >
            {notification.title}
          </p>

          <span className="rounded border border-grayScale-600 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-grayScale-400 uppercase">
            {label}
          </span>
        </div>

        <p className="mt-1 text-xs text-grayScale-400">
          {notification.message}
        </p>

        <p
          className="mt-1 text-[11px] text-grayScale-500"
          title={formatFullDateTime(notification.createdAt)}
        >
          {formatRelativeTime(notification.createdAt)}
        </p>
      </div>
    </div>
  );

  return (
    <li
      className={clsx(
        "border-l-2 px-4 py-3 transition-colors",
        notification.read
          ? "border-transparent"
          : "border-red-cinema bg-red-cinema/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        {href ? (
          <Link
            href={href}
            onClick={onNavigate}
            className="min-w-0 flex-1 hover:opacity-80"
          >
            {body}
          </Link>
        ) : (
          <div className="min-w-0 flex-1">{body}</div>
        )}

        {!notification.read && onMarkRead && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => onMarkRead(notification.id)}
            title="Marcar como lida"
            aria-label={`Marcar "${notification.title}" como lida`}
            className="shrink-0 cursor-pointer rounded p-1 text-grayScale-400 transition-colors hover:bg-grayScale-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <DoneIcon className="text-[16px]" />
          </button>
        )}
      </div>
    </li>
  );
}
