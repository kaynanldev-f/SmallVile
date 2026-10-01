"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";

import HomeOutlinedIcon from "@mui/icons-material/HomeOutlined";
import ConfirmationNumberIcon from "@mui/icons-material/ConfirmationNumberOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLongOutlined";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import CancelRoundedIcon from "@mui/icons-material/CancelRounded";

import Button from "../ui/Button";
import SpinLoader from "../ui/SpinLoader";
import TicketStub from "../tickets/TicketStub";
import TicketDownloadButton from "../tickets/TicketDownloadButton";
import { getTicketsForOrder } from "@/src/actions/ticketsActions";
import { Ticket } from "@/src/types/ticket";
import {
  PAYMENT_STATUSES,
  PaymentStatus,
  PurchaseSummary,
} from "@/src/types/payments";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS } from "@/src/utils/ticket";

interface OrderConfirmedModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseSummary | undefined;
  /** Status real do pagamento, como a API devolve em `GET /payments/:id`. */
  paymentStatus?: PaymentStatus | null;
  /** Motivo da recusa (`payment.failureReason`), quando existir. */
  failureReason?: string;
}

type StatusMeta = {
  title: string;
  badge: string;
  badgeClass: string;
  message: string;
  icon: typeof CheckCircleRoundedIcon;
  iconClass: string;
};

/** Um pagamento pendente NÃO é uma compra aprovada. */
const STATUS_META: Record<PaymentStatus, StatusMeta> = {
  [PAYMENT_STATUSES.PENDING]: {
    title: "Compra realizada!",
    badge: "Em análise",
    badgeClass: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
    message:
      "Seu pedido foi registrado e o pagamento está em análise. Assim que for aprovado, seus ingressos ficam disponíveis em Meus Ingressos.",
    icon: HourglassTopRoundedIcon,
    iconClass: "border-yellow-500/60 text-yellow-300",
  },
  [PAYMENT_STATUSES.APPROVED]: {
    title: "Pedido confirmado!",
    badge: "Compra aprovada",
    badgeClass: "border-green-500/40 bg-green-500/10 text-green-300",
    message:
      "Prepare a pipoca. Seus ingressos digitais estão prontos — você também pode baixá-los em PDF aqui.",
    icon: CheckCircleRoundedIcon,
    iconClass: "border-red-cinema text-red-cinema",
  },
  [PAYMENT_STATUSES.REFUSED]: {
    title: "Compra recusada",
    badge: "Compra recusada",
    badgeClass: "border-red-500/40 bg-red-500/10 text-red-300",
    message:
      "O pagamento não foi aprovado, então nenhum ingresso foi emitido. Você pode tentar pagar novamente em Meus Pedidos.",
    icon: CancelRoundedIcon,
    iconClass: "border-red-500/60 text-red-400",
  },
  [PAYMENT_STATUSES.EXPIRED]: {
    title: "Prazo de pagamento expirado",
    badge: "Compra não concluída",
    badgeClass: "border-grayScale-600 bg-grayScale-700 text-grayScale-300",
    message:
      "O prazo do pagamento venceu e a compra não foi concluída. Você pode iniciar um novo pagamento em Meus Pedidos.",
    icon: CancelRoundedIcon,
    iconClass: "border-grayScale-500 text-grayScale-400",
  },
};

export default function OrderConfirmedModal({
  isOpen,
  onClose,
  order,
  paymentStatus,
  failureReason,
}: OrderConfirmedModalProps) {
  const router = useRouter();

  /** Resultado da última busca junto com a chave do pedido que a originou. */
  const [fetched, setFetched] = useState<{
    key: string;
    tickets: Ticket[];
    error: string | null;
  } | null>(null);
  /** Incrementado pelo botão "tentar novamente" para refazer a busca. */
  const [reloadToken, setReloadToken] = useState(0);

  const orderId = order?._id;
  const status = paymentStatus ?? PAYMENT_STATUSES.PENDING;
  const isApproved = status === PAYMENT_STATUSES.APPROVED;
  const meta = STATUS_META[status] ?? STATUS_META[PAYMENT_STATUSES.PENDING];
  const StatusIcon = meta.icon;

  /**
   * Os ingressos só existem depois que o backend aprova o pagamento
   * (`fulfillPaidOrder`), então a busca acontece apenas nesse caso.
   */
  const requestKey =
    isOpen && orderId && isApproved ? `${orderId}:${reloadToken}` : null;
  /* Enquanto o resultado guardado não for o da busca atual, ela está em voo. */
  const current = fetched?.key === requestKey ? fetched : null;
  const loading = !!requestKey && !current;
  const tickets = current?.tickets ?? [];
  const error = current?.error ?? null;

  useEffect(() => {
    if (!requestKey || !orderId) return;

    let active = true;

    getTicketsForOrder(orderId).then((result) => {
      if (!active) return;

      setFetched(
        result.success
          ? { key: requestKey, tickets: result.data, error: null }
          : { key: requestKey, tickets: [], error: result.error },
      );
    });

    return () => {
      active = false;
    };
  }, [requestKey, orderId]);

  /* Nova chave de busca: o resultado antigo deixa de valer sozinho. */
  const retry = useCallback(() => {
    setReloadToken((token) => token + 1);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen || !order) return null;

  return createPortal(
    /**
     * `pt-24` reserva a altura da Header fixa (4rem) mais respiro, para o
     * cartão não nascer colado no topo nem parecer cortar a Header.
     */
    <div className="fixed inset-0 z-9999 flex min-h-screen items-start justify-center overflow-y-auto bg-deep-black/75 px-4 pt-24 pb-8 backdrop-blur-lg">
      <div
        className="relative flex w-full max-w-220 flex-col items-center rounded-3xl bg-gray-surface px-5 pt-5 pb-6 text-white sm:px-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-full border bg-deep-black ${meta.iconClass}`}
        >
          <StatusIcon sx={{ fontSize: 25 }} />
        </div>

        <h1 className="mt-4 text-center text-3xl leading-tight font-extrabold tracking-tight text-grayScale-200">
          {meta.title}
        </h1>

        <span
          className={`mt-3 rounded-full border px-3 py-1 text-[11px] font-bold ${meta.badgeClass}`}
        >
          Status da compra: {meta.badge}
        </span>

        <p className="mt-3 max-w-120 text-center text-base leading-normal text-grayScale-400">
          {meta.message}
        </p>

        {failureReason && status === PAYMENT_STATUSES.REFUSED && (
          <p className="mt-3 max-w-120 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-center text-sm text-red-200">
            <span className="font-bold">Motivo:</span> {failureReason}
          </p>
        )}

        {/* Dados reais do pedido recém-criado — nada fixo no código. */}
        <OrderSummary order={order} />

        {isApproved && (
          <div className="mt-6 w-full">
            {loading ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-grayScale-600 bg-deep-black px-6 py-10">
                <SpinLoader />

                <p className="text-sm text-grayScale-400">
                  Emitindo seus ingressos...
                </p>
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-6 py-8 text-center">
                <p className="text-sm text-red-400">{error}</p>

                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 cursor-pointer rounded-md border border-grayScale-600 px-4 py-2 text-xs font-bold text-grayScale-200 transition-colors hover:border-red-cinema"
                >
                  Tentar novamente
                </button>
              </div>
            ) : !tickets.length ? (
              /**
               * Pagamento aprovado, ingresso ainda não emitido: melhor dizer
               * isso do que mostrar um ingresso inventado.
               */
              <div className="rounded-xl border border-grayScale-600 bg-deep-black px-6 py-8 text-center">
                <p className="text-sm text-grayScale-400">
                  Seu pagamento foi aprovado e os ingressos estão sendo emitidos.
                  Eles aparecem em <strong>Meus Ingressos</strong> em instantes.
                </p>

                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 cursor-pointer rounded-md border border-grayScale-600 px-4 py-2 text-xs font-bold text-grayScale-200 transition-colors hover:border-red-cinema"
                >
                  Atualizar
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {tickets.map((ticket) => (
                  <div key={ticket._id} className="flex flex-col gap-2">
                    <TicketStub ticket={ticket} />

                    <div className="flex justify-end">
                      <TicketDownloadButton ticket={ticket} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {isApproved && (
            <Button
              onClick={() => {
                onClose();
                router.push("/meus-ingressos");
              }}
              className="gap-2"
            >
              <ConfirmationNumberIcon sx={{ fontSize: 16 }} />
              Meus ingressos
            </Button>
          )}

          <Button
            variant={isApproved ? "secondary" : "primary"}
            onClick={() => {
              onClose();
              router.push("/meus-pedidos");
            }}
            className="gap-2"
          >
            <ReceiptLongIcon sx={{ fontSize: 16 }} />
            Meus pedidos
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              onClose();
              router.push("/");
            }}
            className="gap-2"
          >
            <HomeOutlinedIcon sx={{ fontSize: 16 }} />
            Voltar ao início
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Resumo do que foi comprado, montado com a resposta de `GET /orders/:id`:
 * filme, sessão, sala, assento, tipo do ingresso e valor pago em cada um.
 */
function OrderSummary({ order }: { order: PurchaseSummary }) {
  return (
    <section className="mt-6 w-full rounded-xl border border-grayScale-600 bg-deep-black p-5">
      <h2 className="text-[11px] font-bold tracking-[0.08em] text-grayScale-400 uppercase">
        Seu ingresso
      </h2>

      <dl className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Field label="Filme" value={order.movie} />
        <Field label="Sessão" value={order.session} />
        <Field label="Sala" value={order.room} />
        <Field
          label="Assentos"
          value={order.seats?.length ? order.seats.join(", ") : "—"}
        />
      </dl>

      {!!order.tickets?.length && (
        <ul className="mt-4 flex flex-col gap-1 border-t border-grayScale-600 pt-3">
          {order.tickets.map((ticket, index) => (
            <li
              key={ticket.id ?? ticket.seatNumber ?? index}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-grayScale-300">
                Assento {ticket.seatNumber} ·{" "}
                {TICKET_TYPE_LABELS[ticket.type] ?? ticket.type}
              </span>

              <span className="shrink-0 font-bold text-grayScale-200">
                {formatCents(ticket.price ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!!order.products?.length && (
        <ul className="mt-3 flex flex-col gap-1 border-t border-grayScale-600 pt-3">
          {order.products.map((product) => (
            <li
              key={product.id}
              className="flex items-baseline justify-between gap-3 text-xs"
            >
              <span className="text-grayScale-300">
                {product.quantity}x {product.name}
              </span>

              <span className="shrink-0 font-bold text-grayScale-200">
                {formatCents(product.price ?? 0)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-grayScale-600 pt-3">
        <span className="text-sm font-black text-white">Total</span>

        <span className="text-sm font-black text-red-cinema">
          {formatCents(order.total ?? 0)}
        </span>
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium tracking-[0.08em] text-grayScale-400 uppercase">
        {label}
      </dt>

      <dd className="mt-0.5 truncate font-bold text-grayScale-200" title={value}>
        {value}
      </dd>
    </div>
  );
}
