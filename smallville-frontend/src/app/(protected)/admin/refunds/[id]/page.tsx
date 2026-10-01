import Link from "next/link";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import { getRefundRequest } from "@/src/actions/admin/refundActions";
import OrderCard from "@/src/components/orders/OrderCard";
import RefundAuditTrail from "@/src/components/admin/refunds/RefundAuditTrail";
import RefundDecisionActions from "@/src/components/admin/refunds/RefundDecisionActions";
import { REFUND_STATUSES } from "@/src/types/refund";

export const metadata = {
  title: "Solicitação de reembolso | Admin Cineville",
};

/** Detalhe de uma solicitação, para a análise. */
export default async function AdminRefundDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const result = await getRefundRequest(id);

  return (
    <section className="flex flex-col gap-6">
      <div>
        <Link
          href="/admin/refunds"
          className="inline-flex items-center gap-1 text-xs font-bold text-grayScale-400 transition-colors hover:text-white"
        >
          <ChevronLeftIcon className="text-[18px]" />
          Voltar para os reembolsos
        </Link>

        <h2 className="mt-3 text-xl font-black">Solicitação de reembolso</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Pedido, cliente, itens e histórico da solicitação.
        </p>
      </div>

      {!result.success ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {result.error}
        </p>
      ) : (
        <>
          {/*
            A decisão só aparece com a solicitação em análise. Depois de
            aprovada ou recusada não há segunda decisão: o backend responde 409,
            e o painel dentro do cartão já mostra o desfecho, com data e
            justificativa.
          */}
          {result.data.order.status === REFUND_STATUSES.REQUESTED && (
            <RefundDecisionActions
              orderId={result.data.order.id}
              amount={
                result.data.order.refund?.amount ?? result.data.order.total
              }
            />
          )}

          <OrderCard
            order={result.data.order}
            showUser
            showActions={false}
          />

          <RefundAuditTrail history={result.data.history} />
        </>
      )}
    </section>
  );
}
