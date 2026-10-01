import { listRefundRequests } from "@/src/actions/admin/refundActions";
import RefundsManager from "@/src/components/admin/refunds/RefundsManager";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";
import { isRefundStatus } from "@/src/types/refund";

export const metadata = {
  title: "Reembolsos | Admin Cineville",
};

/** Fila de análise dos reembolsos. */
export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: pageParam, status } = await searchParams;
  const page = parsePageParam(pageParam);

  const result = await listRefundRequests(
    page,
    ADMIN_PAGE_SIZE,
    status && isRefundStatus(status) ? status : undefined,
  );

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-black">Reembolsos</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Solicitações abertas pelos clientes, para análise. Aprovar encerra a
          compra e libera assento, estoque, ingressos e pontos; recusar mantém a
          compra valendo. A devolução do dinheiro é feita fora do sistema — não
          há integração com gateway de pagamento.
        </p>
      </header>

      {!result.success ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {result.error}
        </p>
      ) : (
        <RefundsManager
          requests={result.data.items}
          page={result.data.page}
          limit={result.data.limit}
          total={result.data.total}
          pendingCount={result.data.pendingCount}
        />
      )}
    </section>
  );
}
