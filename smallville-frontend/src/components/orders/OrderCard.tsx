import Link from "next/link";
import type { Order, OrderStatus } from "@/src/types/order";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS } from "@/src/utils/ticket";
import { canRequestRefund } from "@/src/types/refund";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderRefundPanel from "./OrderRefundPanel";
import PaymentDecisionActions from "./PaymentDecisionActions";
import RefundRequestAction from "./RefundRequestAction";

/** Pedidos que ainda dá para pagar (PAYABLE_STATUSES no backend). */
const PAYABLE: OrderStatus[] = [
  "pedido_realizado",
  "pagamento_pendente",
  "pagamento_recusado",
];

function formatCreatedAt(value: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Identificador curto, o mesmo critério usado no código do ingresso. */
function shortId(id: string): string {
  return `#${id.slice(-6).toUpperCase()}`;
}

interface OrderCardProps {
  order: Order;
  /** Mostra o titular do pedido — usado na visão de administrador. */
  showUser?: boolean;
  /** Esconde o botão de retomar pagamento (o admin não paga pelo usuário). */
  showActions?: boolean;
  /**
   * Libera aprovar/recusar o pagamento — só na visão de administrador, e só
   * enquanto o pagamento estiver pendente.
   */
  showApprove?: boolean;
}

export default function OrderCard({
  order,
  showUser = false,
  showActions = true,
  showApprove = false,
}: OrderCardProps) {
  return (
    <article className="rounded-xl border border-grayScale-600 bg-gray-surface p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-black text-white">
              {order.movieTitle ?? "Pedido"}
            </h2>

            <span className="font-mono text-xs text-grayScale-500">
              {shortId(order.id)}
            </span>
          </div>

          <p className="mt-1 text-xs text-grayScale-400">
            Feito em {formatCreatedAt(order.createdAt)}
          </p>

          {showUser && order.user && (
            <p className="mt-1 truncate text-xs text-grayScale-400">
              <span className="font-bold text-grayScale-300">
                {order.user.name || "Usuário"}
              </span>
              {order.user.email && ` · ${order.user.email}`}
            </p>
          )}
        </div>

        <OrderStatusBadge status={order.status} />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
        {order.cinemaName && <Field label="Cinema" value={order.cinemaName} />}

        {order.sessionDateTime && (
          <Field label="Sessão" value={order.sessionDateTime} />
        )}

        {order.roomName && (
          <Field
            label="Sala"
            value={[order.roomName, order.roomType].filter(Boolean).join(" · ")}
          />
        )}

        <Field
          label="Assentos"
          value={
            order.seats.length
              ? order.seats.map((seat) => seat.seatNumber).join(", ")
              : "—"
          }
        />
      </dl>

      {!!order.seats.length && (
        <Section title={`Ingressos (${order.seats.length})`}>
          {order.seats.map((seat) => (
            <Row
              key={seat.seatNumber}
              label={`Assento ${seat.seatNumber} · ${
                TICKET_TYPE_LABELS[seat.type] ?? seat.type
              }`}
              value={formatCents(seat.pricePaid)}
            />
          ))}
        </Section>
      )}

      {!!order.products.length && (
        <Section title="Bomboniere">
          {order.products.map((product) => (
            <Row
              key={product.id || product.name}
              label={`${product.quantity}x ${product.name}`}
              hint={
                product.quantity > 1
                  ? `${formatCents(product.unitPrice)} cada`
                  : product.size
              }
              value={formatCents(product.pricePaid)}
            />
          ))}
        </Section>
      )}

      <div className="mt-5 border-t border-grayScale-600 pt-4">
        <Row
          label="Ingressos"
          value={formatCents(order.ticketsTotal)}
          muted
        />

        {order.productsTotal > 0 && (
          <Row
            label="Bomboniere"
            value={formatCents(order.productsTotal)}
            muted
          />
        )}

        {order.discount > 0 && (
          <Row
            label="Desconto"
            value={`- ${formatCents(order.discount)}`}
            muted
          />
        )}

        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-black text-white">Total</span>

          <span className="text-sm font-black text-red-cinema">
            {formatCents(order.total)}
          </span>
        </div>
      </div>

      {/*
        O motivo é do usuário: é ele que precisa entender por que a compra não
        foi confirmada. Aparece nos dois lados, porque a mesma tela serve de
        detalhe do pedido para usuário e administrador.
      */}
      {order.status === "pagamento_recusado" && order.paymentFailureReason && (
        <div className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-[11px] font-bold tracking-[0.08em] text-red-300 uppercase">
            Motivo da recusa
          </p>

          <p className="mt-1 text-xs text-red-200">
            {order.paymentFailureReason}
          </p>
        </div>
      )}

      {/*
        Situação do reembolso, quando existir solicitação. Aparece nos dois
        lados — o comprador acompanha a análise, e o administrador vê o mesmo
        na listagem de pedidos.
      */}
      <OrderRefundPanel order={order} />

      {/*
        Só em "pagamento_pendente": é o único status em que existe um
        pagamento aguardando no backend. Em "pedido_realizado" o usuário nem
        escolheu a forma de pagamento, e depois de aprovado ou recusado o
        desfecho é definitivo — nos dois casos a rota responderia erro, então
        as ações saem da tela.
      */}
      {showApprove && order.status === "pagamento_pendente" && (
        <PaymentDecisionActions orderId={order.id} />
      )}

      {showActions && (
        <div className="mt-5 flex flex-wrap gap-3">
          {PAYABLE.includes(order.status) && (
            <Link
              href={`/payment/${order.id}`}
              className="inline-flex items-center rounded-md bg-button-primary px-4 py-2 text-sm font-bold text-white transition-all hover:scale-105"
            >
              Retomar pagamento
            </Link>
          )}

          {order.ticketAvailable && (
            <Link
              href="/meus-ingressos"
              className="inline-flex items-center rounded-md border border-grayScale-600 px-4 py-2 text-sm font-bold text-grayScale-200 transition-colors hover:border-red-cinema"
            >
              Ver ingressos ({order.ticketsCount})
            </Link>
          )}

          {/*
            `canRequestRefund` espelha `isRefundAllowed` do backend: pedido
            pago, em `pagamento_aprovado` ou `pedido_cancelado`, e sem
            solicitação anterior. Assim que existe `refund.requestedAt` o botão
            não volta — quem informa a situação passa a ser o
            `OrderRefundPanel` acima ("em análise", "aprovado", "recusado").

            Fica sob `showActions`, ou seja, só na visão do comprador: solicitar
            reembolso é ato do dono do pedido, e a rota é do dono. O
            administrador decide, mas não solicita pelo cliente.
          */}
          {canRequestRefund(order) && (
            <RefundRequestAction orderId={order.id} total={order.total} />
          )}
        </div>
      )}
    </article>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-grayScale-400">{label}</dt>
      <dd className="mt-0.5 truncate font-bold" title={value}>
        {value}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-5 border-t border-grayScale-600 pt-4">
      <h3 className="mb-2 text-[11px] font-bold tracking-[0.08em] text-grayScale-400 uppercase">
        {title}
      </h3>

      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  muted,
}: {
  label: string;
  value: string;
  /** Detalhe secundário, como o preço unitário do produto. */
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs">
      <span className={muted ? "text-grayScale-400" : "text-grayScale-300"}>
        {label}

        {hint && (
          <span className="ml-2 text-[11px] text-grayScale-500">{hint}</span>
        )}
      </span>

      <span
        className={`shrink-0 font-bold ${
          muted ? "text-grayScale-400" : "text-grayScale-200"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
