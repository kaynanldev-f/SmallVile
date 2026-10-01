"use client";

import { ArrowLeft, Loader2, X } from "lucide-react";
import Button from "@/src/components/ui/Button";

interface PaymentButtonsProps {
  loading: boolean;
  disabled: boolean;
  onConfirm: () => void;
  onBack: () => void;
  onCancel: () => void;
  showConfirm?: boolean;
}

export default function PaymentButtons({
  loading,
  disabled,
  onConfirm,
  onBack,
  onCancel,
}: PaymentButtonsProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={onBack}>
            <ArrowLeft size={18} />
            Voltar
          </Button>

          <Button type="button" variant="primary" onClick={onCancel}>
            <X size={18} />
            Cancelar Compra
          </Button>
        </div>

        <Button
          type="button"
          disabled={disabled || loading}
          onClick={onConfirm}
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Processando...
            </>
          ) : (
            "Confirmar Pagamento"
          )}
        </Button>
      </div>
    </section>
  );
}
