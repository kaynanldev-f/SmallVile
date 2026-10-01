import { redirect } from "next/navigation";
import Footer from "@/src/components/layout/Footer/Footer";
import NotificationsInbox from "@/src/components/notifications/NotificationsInbox";
import { isServerAdmin } from "@/src/lib/auth";

export const metadata = {
  title: "Notificações | Cineville",
};

/** Caixa de notificações do requisitante. */
export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; unread?: string }>;
}) {
  const { page, unread } = await searchParams;

  if (await isServerAdmin()) {
    const params = new URLSearchParams();

    if (page) params.set("page", page);
    if (unread) params.set("unread", unread);

    const query = params.toString();

    redirect(`/admin/notifications${query ? `?${query}` : ""}`);
  }

  return (
    <>
      <div className="bg-deep-black text-grayScale-200 min-h-screen pt-16">
        <div className="mx-auto max-w-3xl px-5 py-10 sm:px-6">
          <h1 className="mb-2 text-3xl font-black">Notificações</h1>

          <p className="mb-8 text-sm text-grayScale-400">
            Acompanhe aqui o andamento das suas compras, pagamentos e
            ingressos.
          </p>

          <NotificationsInbox pageParam={page} unreadParam={unread} />
        </div>

        <Footer />
      </div>
    </>
  );
}
