"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestOrderRefund } from "@/src/actions/myOrdersActions";
import { REFUND_REASON_MAX_LENGTH } from "@/src/types/refund";
import { formatCents } from "@/src/utils/currency";
import AdminModal from "@/src/components/admin/AdminModal";

interface Props {
  orderId: string;
  /** Total do pedido, em centavos — é o valor integral que será analisado. */
  total: number;
}

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center rounded-md px-4 py-2 text-sm font-bold transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100";

/** Abertura da solicitação de reembolso pelo comprador. */
export default function RefundRequestAction({ orderId, total }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);

    startTransition(async () => {
      const result = await requestOrderRefund(orderId, reason);

      if (!result.success) {
        // Mensagem do backend quando existir (pedido não elegível,
        // solicitação já aberta); nunca um texto genérico no lugar dela.
        setError(result.error);
        return;
      }

      setOpen(false);
      setReason("");

      // O servidor passa a devolver o pedido em `reembolso_solicitado`: o
      // botão sai da tela e o aviso "em análise" entra, sem reload manual.
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className={`${BUTTON_BASE} border border-grayScale-600 text-grayScale-200 hover:border-red-cinema`}
      >
        Solicitar reembolso
      </button>

      <AdminModal
        open={open}
        title="Solicitar reembolso?"
        onClose={() => {
          if (!isPending) setOpen(false);
        }}
        footer={
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className={`${BUTTON_BASE} border border-grayScale-600 text-grayScale-200`}
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={isPending}
              className={`${BUTTON_BASE} bg-button-primary text-white`}
            >
              {isPending ? "Enviando..." : "Solicitar reembolso"}
            </button>
          </>
        }
      >
        <p className="text-sm text-grayScale-300">
          Você vai pedir o reembolso de{" "}
          <span className="font-bold text-white">{formatCents(total)}</span>, o
          valor integral deste pedido. A solicitação passa por análise do cinema
          e você será avisado da decisão por notificação.
        </p>

        <p className="mt-3 text-xs text-grayScale-400">
          Só é possível solicitar uma vez por pedido, então confirme antes de
          continuar. Se aprovada, seus ingressos deste pedido deixam de ser
          válidos e o valor é devolvido pelo meio de pagamento usado na compra.
        </p>

        <label
          htmlFor={`refund-reason-${orderId}`}
          className="mt-5 block text-xs font-bold text-grayScale-300"
        >
          Motivo{" "}
          <span className="font-normal text-grayScale-500">(opcional)</span>
        </label>

        <textarea
          id={`refund-reason-${orderId}`}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          maxLength={REFUND_REASON_MAX_LENGTH}
          placeholder="Ex.: Não vou conseguir comparecer à sessão"
          className="mt-2 w-full resize-none rounded-lg border border-grayScale-600 bg-deep-black px-3 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema"
        />

        {error && (
          <p role="alert" className="mt-3 text-xs text-red-400">
            {error}
          </p>
        )}
      </AdminModal>
    </>
  );
}
