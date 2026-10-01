"use client";

import { useRouter } from "next/navigation";
import VisibilityIcon from "@mui/icons-material/VisibilityOutlined";
import AdminTable, { AdminColumn } from "../AdminTable";
import AdminPagination from "../AdminPagination";
import { useQueryParams } from "@/src/hooks/useQueryParams";
import type { Order } from "@/src/types/order";
import {
  REFUND_STATUSES,
  REFUND_STATUS_LABELS,
  REFUND_STATUS_ORDER,
  REFUND_STATUS_TONES,
  RefundStatus,
  isRefundStatus,
} from "@/src/types/refund";
import { formatCents } from "@/src/utils/currency";
import { formatFullDateTime } from "@/src/utils/relative-time";

interface Props {
  requests: Order[];
  page: number;
  limit: number;
  total: number;
  /** Pendências em toda a base — não muda com o filtro da tela. */
  pendingCount: number;
}

/** Identificador curto, o mesmo critério do cartão de pedido. */
function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

/** Fila de análise das solicitações de reembolso. */
export default function RefundsManager({
  requests,
  page,
  limit,
  total,
  pendingCount,
}: Props) {
  const router = useRouter();
  const { searchParams, update, isPending } = useQueryParams();

  const rawStatus = searchParams.get("status") ?? "";
  const filter: RefundStatus | null = isRefundStatus(rawStatus)
    ? rawStatus
    : null;

  const columns: AdminColumn<Order>[] = [
    {
      header: "Pedido",
      render: (order) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-bold text-white">
            {shortId(order.id)}
          </p>

          <p className="truncate text-xs text-grayScale-400">
            {order.movieTitle ?? "—"}
          </p>

          <p className="text-[11px] text-grayScale-500">
            Compra em {formatFullDateTime(order.createdAt)}
          </p>
        </div>
      ),
    },
    {
      header: "Cliente",
      render: (order) => (
        <div className="min-w-0">
          <p className="truncate font-bold">{order.user?.name || "—"}</p>

          {order.user?.email && (
            <p className="truncate text-xs text-grayScale-400">
              {order.user.email}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Valor",
      render: (order) => (
        <span className="font-bold whitespace-nowrap">
          {/*
            `refund.amount` é o valor congelado na solicitação; o total do
            pedido é a retaguarda para solicitações abertas antes do campo
            existir. Não há reembolso parcial: os dois são o valor integral.
          */}
          {formatCents(order.refund?.amount ?? order.total)}
        </span>
      ),
    },
    {
      header: "Solicitado em",
      render: (order) => (
        <span className="whitespace-nowrap text-xs">
          {order.refund?.requestedAt
            ? formatFullDateTime(order.refund.requestedAt)
            : "—"}
        </span>
      ),
    },
    {
      header: "Motivo do cliente",
      render: (order) =>
        order.refund?.reason ? (
          /* Largura limitada no DIV: em `table-layout: auto` a célula ignora o limite. */
          <div
            className="line-clamp-2 max-w-[16rem] text-xs"
            title={order.refund.reason}
          >
            {order.refund.reason}
          </div>
        ) : (
          <span className="text-xs text-grayScale-500">Não informado</span>
        ),
    },
    {
      header: "Situação",
      render: (order) => {
        const status = isRefundStatus(order.status)
          ? order.status
          : REFUND_STATUSES.REQUESTED;

        return (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${REFUND_STATUS_TONES[status]}`}
          >
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full bg-current"
            />

            {REFUND_STATUS_LABELS[status]}
          </span>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <FilterChip
          label="Todas"
          active={!filter}
          disabled={isPending}
          onClick={() => update({ status: null, page: null })}
        />

        {REFUND_STATUS_ORDER.map((status) => (
          <FilterChip
            key={status}
            label={REFUND_STATUS_LABELS[status]}
            active={filter === status}
            disabled={isPending}
            onClick={() => update({ status, page: null })}
          />
        ))}

        {pendingCount > 0 && (
          <span className="ml-auto rounded-full border border-yellow-500/40 bg-yellow-500/10 px-3 py-1 text-[11px] font-bold text-yellow-300">
            {pendingCount}{" "}
            {pendingCount === 1
              ? "solicitação aguardando decisão"
              : "solicitações aguardando decisão"}
          </span>
        )}
      </div>

      <div className={isPending ? "opacity-60" : ""}>
        <AdminTable
          rows={requests}
          columns={columns}
          rowKey={(order) => order.id}
          emptyMessage={
            filter
              ? `Nenhuma solicitação com a situação "${REFUND_STATUS_LABELS[filter]}".`
              : "Nenhuma solicitação de reembolso encontrada."
          }
          actions={[
            {
              icon: <VisibilityIcon className="text-[18px]" />,
              label: "Analisar solicitação",
              onClick: (order) => router.push(`/admin/refunds/${order.id}`),
            },
          ]}
        />
      </div>

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        itemLabel="solicitações"
      />
    </div>
  );
}

function FilterChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`shrink-0 cursor-pointer rounded-lg border px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed ${
        active
          ? "border-red-cinema bg-red-cinema text-white"
          : "border-grayScale-600 bg-gray-surface text-grayScale-400 hover:border-red-cinema hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
