import Link from "next/link";
import Footer from "@/src/components/layout/Footer/Footer";
import TicketsList from "@/src/components/tickets/TicketsList";
import { getAllTickets, getMyTickets } from "@/src/actions/ticketsActions";
import { getServerUser } from "@/src/lib/auth";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";
import type { Ticket } from "@/src/types/ticket";

export const metadata = {
  title: "Meus Ingressos | Cineville",
};

export default async function MeusIngressosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const user = await getServerUser();
  const isAdmin = user?.role === "ADMIN";
  const page = parsePageParam((await searchParams).page);

  /**
   * Regra do backend: `GET /tickets/my-tickets` filtra pelo usuário do token e
   * devolve todos os ingressos dele; `GET /tickets` é a rota paginada que o
   * administrador usa para ver o sistema inteiro.
   */
  const result = isAdmin
    ? await getAllTickets(page, ADMIN_PAGE_SIZE)
    : await getMyTickets();

  const tickets: Ticket[] = !result.success
    ? []
    : Array.isArray(result.data)
      ? result.data
      : result.data.items;

  const pagination =
    result.success && !Array.isArray(result.data)
      ? {
          page: result.data.page,
          limit: result.data.limit,
          total: result.data.total,
        }
      : undefined;

  return (
    <>
      <div className="bg-deep-black text-grayScale-200 min-h-screen pt-16">
        <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6">
          <header className="mb-8">
            <h1 className="text-3xl font-black">
              {isAdmin ? "Ingressos" : "Meus Ingressos"}
            </h1>

            <p className="mt-2 text-sm text-grayScale-400">
              {isAdmin
                ? "Como administrador, você vê todos os ingressos emitidos no sistema."
                : "Seus ingressos ficam disponíveis aqui assim que o pagamento é aprovado."}
            </p>
          </header>

          {!result.success ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
              <p className="text-sm text-red-400">{result.error}</p>

              <Link
                href="/meus-pedidos"
                className="mt-3 inline-block text-xs font-bold text-grayScale-200 underline"
              >
                Ver meus pedidos
              </Link>
            </div>
          ) : (
            <TicketsList
              tickets={tickets}
              searchable={isAdmin}
              pagination={pagination}
              emptyMessage={
                isAdmin
                  ? "Nenhum ingresso emitido até o momento."
                  : "Você ainda não tem ingressos. Escolha um filme e garanta o seu."
              }
            />
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
