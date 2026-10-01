import { getMyNotifications } from "@/src/actions/notificationActions";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";
import NotificationsList from "./NotificationsList";

interface Props {
  /** `?page=` cru da URL. */
  pageParam?: string;
  /** `?unread=` cru da URL — "1" liga o filtro de não lidas. */
  unreadParam?: string;
}

/** Caixa de notificações — a MESMA em `/notificacoes` e em `/admin/notifications`. */
export default async function NotificationsInbox({
  pageParam,
  unreadParam,
}: Props) {
  const page = parsePageParam(pageParam);
  const onlyUnread = unreadParam === "1";

  const result = await getMyNotifications(page, ADMIN_PAGE_SIZE, onlyUnread);

  return (
    <NotificationsList
      notifications={result.success ? result.data.items : []}
      unreadCount={result.success ? result.data.unreadCount : 0}
      page={result.success ? result.data.page : page}
      limit={result.success ? result.data.limit : ADMIN_PAGE_SIZE}
      total={result.success ? result.data.total : 0}
      onlyUnread={onlyUnread}
      loadError={result.success ? undefined : result.error}
    />
  );
}
