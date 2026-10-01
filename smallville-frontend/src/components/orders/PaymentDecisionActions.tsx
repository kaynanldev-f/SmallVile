"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveOrderPayment,
  rejectOrderPayment,
} from "@/src/actions/myOrdersActions";
import {
  REJECTION_REASON_MAX_LENGTH,
  REJECTION_REASON_MIN_LENGTH,
} from "@/src/types/payments";
import AdminModal from "@/src/components/admin/AdminModal";

interface PaymentDecisionActionsProps {
  orderId: string;
}

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center rounded-md px-4 py-2 text-sm font-bold transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

/** Decisão do administrador sobre um pagamento pendente: aprovar ou recusar. */
export default function PaymentDecisionActions({
  orderId,
}: PaymentDecisionActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [refuseOpen, setRefuseOpen] = useState(false);
  const [reason, setReason] = useState("");

  function handleApprove() {
    setError(null);

    startTransition(async () => {
      const result = await approveOrderPayment(orderId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      router.refresh();
    });
  }

  function handleReject() {
    const trimmed = reason.trim();

    // O backend valida `reason` com 3 caracteres no mínimo quando ele vem no
    // corpo. Avisar aqui evita gastar uma requisição para receber um 400.
    if (trimmed.length > 0 && trimmed.length < REJECTION_REASON_MIN_LENGTH) {
      setError(
        `O motivo deve ter ao menos ${REJECTION_REASON_MIN_LENGTH} caracteres — ou deixe o campo vazio.`,
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await rejectOrderPayment(orderId, trimmed);

      if (!result.success) {
        // Mensagem do backend quando existir (transição inválida, pagamento
        // inexistente); nunca um texto genérico engolindo o motivo real.
        setError(result.error);
        return;
      }

      setRefuseOpen(false);
      setReason("");

      // Recarrega os dados do servidor: o status vira "Pagamento recusado" e
      // este bloco de ações sai da tela, sem reload manual.
      router.refresh();
    });
  }

  return (
    <div className="mt-5 flex flex-col gap-2 border-t border-grayScale-600 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className={`${BUTTON_BASE} bg-button-primary text-white`}
        >
          {isPending ? "Processando..." : "Aprovar pagamento"}
        </button>

        <button
          type="button"
          onClick={() => {
            setError(null);
            setRefuseOpen(true);
          }}
          disabled={isPending}
          className={`${BUTTON_BASE} border border-red-500/60 text-red-300 hover:bg-red-500/10`}
        >
          Recusar pagamento
        </button>

        <span className="text-[11px] text-grayScale-500">
          Gateway mockado: aprovar emite os ingressos; recusar encerra a
          cobrança sem emitir.
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      <AdminModal
        open={refuseOpen}
        title="Recusar pagamento?"
        onClose={() => {
          if (!isPending) setRefuseOpen(false);
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setRefuseOpen(false)}
              disabled={isPending}
              className={`${BUTTON_BASE} border border-grayScale-600 text-grayScale-200`}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleReject}
              disabled={isPending}
              className={`${BUTTON_BASE} bg-red-600 text-white`}
            >
              {isPending ? "Recusando..." : "Confirmar recusa"}
            </button>
          </>
        }
      >
        <p className="text-sm text-grayScale-300">
          O pedido não será confirmado e nenhum ingresso será emitido. O usuário
          verá o pagamento como recusado no pedido dele.
        </p>

        <label
          htmlFor={`refuse-reason-${orderId}`}
          className="mt-5 block text-xs font-bold text-grayScale-300"
        >
          Motivo da recusa{" "}
          <span className="font-normal text-grayScale-500">(opcional)</span>
        </label>

        <textarea
          id={`refuse-reason-${orderId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={REJECTION_REASON_MAX_LENGTH}
          placeholder="Ex.: Pagamento não identificado"
          className="mt-2 w-full resize-none rounded-lg border border-grayScale-600 bg-deep-black px-3 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema"
        />

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}
      </AdminModal>
    </div>
  );
}
