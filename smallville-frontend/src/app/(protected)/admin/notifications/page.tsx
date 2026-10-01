import NotificationsInbox from "@/src/components/notifications/NotificationsInbox";

export const metadata = {
  title: "Notificações | Admin Cineville",
};

/** Notificações do administrador, DENTRO do dashboard. */
export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unread?: string }>;
}) {
  const { page, unread } = await searchParams;

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-black">Notificações</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Vendas novas, pagamentos aguardando análise e alertas de estoque.
        </p>
      </header>

      <NotificationsInbox pageParam={page} unreadParam={unread} />
    </section>
  );
}
