"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveOrderPayment } from "@/src/actions/myOrdersActions";

interface ApprovePaymentButtonProps {
  orderId: string;
}

/**
 * Conclui, pelo painel, um pagamento que o gateway mockado deixaria pendente
 * para sempre — o PIX simulado nunca recebe a confirmação do banco.
 */
export default function ApprovePaymentButton({
  orderId,
}: ApprovePaymentButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="mt-5 flex flex-col gap-2 border-t border-grayScale-600 pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={isPending}
          className="inline-flex cursor-pointer items-center rounded-md bg-button-primary px-4 py-2 text-sm font-bold text-white transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
        >
          {isPending ? "Aprovando..." : "Aprovar pagamento"}
        </button>

        <span className="text-[11px] text-grayScale-500">
          Gateway mockado: aprova a cobrança e emite os ingressos.
        </span>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
