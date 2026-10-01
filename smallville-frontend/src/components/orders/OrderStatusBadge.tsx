import type { OrderStatus } from "@/src/types/order";
import {
  REFUND_STATUS_LABELS,
  REFUND_STATUS_TONES,
} from "@/src/types/refund";

/** Rótulo e cor de cada OrderStatus do backend. */
const STATUS_META: Record<OrderStatus, { label: string; className: string }> = {
  pedido_realizado: {
    label: "Pedido realizado",
    className: "border-blue-500/40 bg-blue-500/10 text-blue-300",
  },
  pagamento_pendente: {
    label: "Pagamento pendente",
    className: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  },
  pagamento_aprovado: {
    label: "Pagamento aprovado",
    className: "border-green-500/40 bg-green-500/10 text-green-300",
  },
  pagamento_recusado: {
    label: "Pagamento recusado",
    className: "border-red-500/40 bg-red-500/10 text-red-300",
  },
  pedido_cancelado: {
    label: "Cancelado",
    className: "border-grayScale-600 bg-grayScale-700 text-grayScale-400",
  },
  expirado: {
    label: "Expirado",
    className: "border-grayScale-600 bg-grayScale-700 text-grayScale-400",
  },
  // Os status de reembolso vêm de `types/refund.ts`, para não duplicar rótulos.
  reembolso_solicitado: {
    label: REFUND_STATUS_LABELS.reembolso_solicitado,
    className: REFUND_STATUS_TONES.reembolso_solicitado,
  },
  reembolso_aprovado: {
    label: REFUND_STATUS_LABELS.reembolso_aprovado,
    className: REFUND_STATUS_TONES.reembolso_aprovado,
  },
  reembolso_recusado: {
    label: REFUND_STATUS_LABELS.reembolso_recusado,
    className: REFUND_STATUS_TONES.reembolso_recusado,
  },
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    className: "border-grayScale-600 bg-grayScale-700 text-grayScale-400",
  };

  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-[11px] font-bold ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}
