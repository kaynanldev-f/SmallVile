import Footer from "@/src/components/layout/Footer/Footer";
import MyOrdersList from "@/src/components/orders/MyOrdersList";
import { getMyOrders } from "@/src/actions/myOrdersActions";
import type { OrderStatus } from "@/src/types/order";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";

export default async function MeusPedidosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = parsePageParam(pageParam);

  const result = await getMyOrders(
    page,
    ADMIN_PAGE_SIZE,
    status as OrderStatus | undefined,
  );

  return (
    <>
      <div className="bg-deep-black text-grayScale-200 min-h-screen pt-16">
        <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6">
          <h1 className="mb-8 text-3xl font-black">Meus Pedidos</h1>

          {result.success ? (
            <MyOrdersList
              orders={result.data.items}
              page={result.data.page}
              limit={result.data.limit}
              total={result.data.total}
            />
          ) : (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {result.error}
            </p>
          )}
        </div>

        <Footer />
      </div>
    </>
  );
}
