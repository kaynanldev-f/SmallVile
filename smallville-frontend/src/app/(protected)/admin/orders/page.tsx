import { getAllOrders } from "@/src/actions/myOrdersActions";
import type { OrderStatus } from "@/src/types/order";
import MyOrdersList from "@/src/components/orders/MyOrdersList";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";

export const metadata = {
  title: "Pedidos | Admin Cineville",
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = parsePageParam(pageParam);

  // O filtro de status vai para a API: paginar 10 em 10 sobre o recorte certo,
  // e não sobre tudo para filtrar depois na tela.
  const result = await getAllOrders(
    page,
    ADMIN_PAGE_SIZE,
    status as OrderStatus | undefined,
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-black">Pedidos</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Todos os pedidos do sistema, com usuário, sessão, assentos, produtos e
          valores.
        </p>
      </header>

      {!result.success ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {result.error}
        </p>
      ) : (
        <MyOrdersList
          orders={result.data.items}
          admin
          emptyMessage="Nenhum pedido registrado até o momento."
          page={result.data.page}
          limit={result.data.limit}
          total={result.data.total}
        />
      )}
    </section>
  );
}
