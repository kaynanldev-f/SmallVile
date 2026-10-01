import type { Order } from "@/src/types/order";
import {
  REFUND_STATUSES,
  REFUND_STATUS_LABELS,
  isRefundStatus,
} from "@/src/types/refund";
import { formatCents } from "@/src/utils/currency";
import { formatFullDateTime } from "@/src/utils/relative-time";

/** Situação da solicitação de reembolso, dentro do pedido. */
export default function OrderRefundPanel({ order }: { order: Order }) {
  const refund = order.refund;

  if (!refund?.requestedAt) return null;

  // O status do PEDIDO é o status da solicitação. Um pedido com solicitação
  // aberta está sempre em um dos três; o `isRefundStatus` evita supor isso.
  const status = isRefundStatus(order.status)
    ? order.status
    : REFUND_STATUSES.REQUESTED;

  const tone = {
    [REFUND_STATUSES.REQUESTED]:
      "border-yellow-500/40 bg-yellow-500/10 text-yellow-200",
    [REFUND_STATUSES.APPROVED]:
      "border-green-500/40 bg-green-500/10 text-green-200",
    [REFUND_STATUSES.REJECTED]: "border-red-500/40 bg-red-500/10 text-red-200",
  }[status];

  const headline = {
    [REFUND_STATUSES.REQUESTED]:
      "Sua solicitação está em análise. Você será avisado por notificação quando houver uma decisão.",
    [REFUND_STATUSES.APPROVED]:
      "Reembolso aprovado pelo cinema. O valor será devolvido pelo meio de pagamento usado na compra, e os ingressos deste pedido não são mais válidos.",
    [REFUND_STATUSES.REJECTED]:
      "A solicitação foi recusada e a compra segue valendo: o ingresso continua válido e o assento continua reservado.",
  }[status];

  const amount = refund.amount ?? order.total;

  return (
    <div className={`mt-5 rounded-lg border px-4 py-3 ${tone}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-bold tracking-[0.08em] uppercase">
          {REFUND_STATUS_LABELS[status]}
        </p>

        <span className="text-xs font-black">{formatCents(amount)}</span>
      </div>

      <p className="mt-1.5 text-xs opacity-90">{headline}</p>

      <dl className="mt-3 flex flex-col gap-1.5 text-xs">
        <Line
          label="Solicitado em"
          value={formatFullDateTime(refund.requestedAt)}
        />

        {refund.reason && <Line label="Motivo informado" value={refund.reason} />}

        {refund.resolvedAt && (
          <Line label="Analisado em" value={formatFullDateTime(refund.resolvedAt)} />
        )}

        {/*
          A justificativa do administrador. Na recusa o backend a exige, então
          ela sempre existe; na aprovação é opcional e o bloco simplesmente não
          aparece.
        */}
        {refund.resolutionReason && (
          <Line label="Decisão do cinema" value={refund.resolutionReason} />
        )}
      </dl>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="shrink-0 opacity-70">{label}:</dt>
      <dd className="font-bold break-words">{value}</dd>
    </div>
  );
}
