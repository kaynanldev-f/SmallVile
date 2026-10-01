"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveRefundRequest,
  rejectRefundRequest,
} from "@/src/actions/admin/refundActions";
import {
  RESOLUTION_REASON_MAX_LENGTH,
  RESOLUTION_REASON_MIN_LENGTH,
} from "@/src/types/refund";
import { formatCents } from "@/src/utils/currency";
import AdminModal from "../AdminModal";

interface Props {
  orderId: string;
  /** Valor integral da solicitação, em centavos. */
  amount: number;
}

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center rounded-md px-4 py-2 text-sm font-bold transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

type Decision = "approve" | "reject" | null;

/** Decisão do administrador sobre uma solicitação em análise. */
export default function RefundDecisionActions({ orderId, amount }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState<Decision>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function open(next: Exclude<Decision, null>) {
    setError(null);
    setReason("");
    setDecision(next);
  }

  function close() {
    if (!isPending) setDecision(null);
  }

  function submit() {
    const trimmed = reason.trim();

    if (
      trimmed.length > 0 &&
      trimmed.length < RESOLUTION_REASON_MIN_LENGTH
    ) {
      setError(
        `A justificativa deve ter ao menos ${RESOLUTION_REASON_MIN_LENGTH} caracteres.`,
      );
      return;
    }

    if (decision === "reject" && !trimmed) {
      setError("Informe o motivo da recusa. Ele é enviado ao cliente.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const result =
        decision === "approve"
          ? await approveRefundRequest(orderId, trimmed)
          : await rejectRefundRequest(orderId, trimmed);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setDecision(null);
      setReason("");

      // O servidor devolve o pedido já resolvido: este bloco sai da tela e o
      // painel de situação passa a mostrar a decisão.
      router.refresh();
    });
  }

  const approving = decision === "approve";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <div>
        <h3 className="text-sm font-black text-grayScale-200">
          Decisão da solicitação
        </h3>

        <p className="mt-1 text-xs text-grayScale-400">
          Valor integral em análise:{" "}
          <span className="font-bold text-grayScale-200">
            {formatCents(amount)}
          </span>
          . A decisão é única e não pode ser desfeita.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => open("approve")}
          disabled={isPending}
          className={`${BUTTON_BASE} bg-button-primary text-white`}
        >
          Aprovar reembolso
        </button>

        <button
          type="button"
          onClick={() => open("reject")}
          disabled={isPending}
          className={`${BUTTON_BASE} border border-red-500/60 text-red-300 hover:bg-red-500/10`}
        >
          Recusar reembolso
        </button>
      </div>

      {/*
        Dito na própria tela de decisão, não só no relatório: aprovar encerra a
        compra e libera os recursos, mas o sistema não tem gateway de pagamento
        — a devolução do dinheiro é operação externa.
      */}
      <p className="text-[11px] text-grayScale-500">
        Aprovar libera o assento, restitui o estoque da bomboniere, invalida os
        ingressos e estorna os pontos da compra. O sistema não possui integração
        com gateway de pagamento: a devolução do dinheiro é feita fora dele.
      </p>

      {error && !decision && (
        <p role="alert" className="text-xs text-red-400">
          {error}
        </p>
      )}

      <AdminModal
        open={decision !== null}
        title={approving ? "Aprovar reembolso?" : "Recusar reembolso?"}
        onClose={close}
        footer={
          <>
            <button
              type="button"
              onClick={close}
              disabled={isPending}
              className={`${BUTTON_BASE} border border-grayScale-600 text-grayScale-200`}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={submit}
              disabled={isPending}
              className={`${BUTTON_BASE} ${
                approving ? "bg-button-primary" : "bg-red-600"
              } text-white`}
            >
              {isPending
                ? approving
                  ? "Aprovando..."
                  : "Recusando..."
                : approving
                  ? "Aprovar reembolso"
                  : "Confirmar recusa"}
            </button>
          </>
        }
      >
        {approving ? (
          <>
            <p className="text-sm text-grayScale-300">
              O reembolso de{" "}
              <span className="font-bold text-white">{formatCents(amount)}</span>{" "}
              será aprovado. <span className="font-bold">Não é possível
              desfazer.</span>
            </p>

            <p className="mt-3 text-xs text-grayScale-400">
              A compra é encerrada: o assento volta para o mapa da sessão, o
              estoque da bomboniere é restituído, os ingressos deste pedido
              deixam de valer e os pontos ganhos na compra são estornados. O
              cliente é notificado de que a devolução será feita pelo meio de
              pagamento usado.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-grayScale-300">
              A solicitação será recusada e{" "}
              <span className="font-bold">a compra continua valendo</span>: o
              ingresso segue válido e o assento continua reservado.{" "}
              <span className="font-bold">Não é possível desfazer.</span>
            </p>

            <p className="mt-3 text-xs text-grayScale-400">
              O motivo abaixo é enviado ao cliente na notificação e fica
              registrado na solicitação.
            </p>
          </>
        )}

        <label
          htmlFor={`refund-resolution-${orderId}`}
          className="mt-5 block text-xs font-bold text-grayScale-300"
        >
          {approving ? "Observação da decisão" : "Motivo da recusa"}{" "}
          <span className="font-normal text-grayScale-500">
            {approving ? "(opcional)" : "(obrigatório)"}
          </span>
        </label>

        <textarea
          id={`refund-resolution-${orderId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={RESOLUTION_REASON_MAX_LENGTH}
          placeholder={
            approving
              ? "Ex.: Sessão cancelada pelo cinema"
              : "Ex.: A sessão já foi realizada e o ingresso foi utilizado"
          }
          className="mt-2 w-full resize-none rounded-lg border border-grayScale-600 bg-deep-black px-3 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema"
        />

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {error}
          </p>
        )}
      </AdminModal>
    </div>
  );
}
