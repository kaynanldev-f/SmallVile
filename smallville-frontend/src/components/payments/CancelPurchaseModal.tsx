"use client";

import { AlertTriangle, Loader2 } from "lucide-react";

interface CancelPurchaseModalProps {
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function CancelPurchaseModal({
  open,
  loading = false,
  onClose,
  onConfirm,
}: CancelPurchaseModalProps) {
  if (!open) return null;

  return (
    /**
     * `z-99` fica acima da Header (`z-50`) do layout protegido: com o mesmo
     * z-index, quem ficasse por cima dependia da ordem de renderização.
     */
    <div className="fixed inset-0 z-99 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <div className="flex flex-col items-center p-8">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <AlertTriangle size={32} className="text-red-500" />
          </div>

          <h2 className="text-xl font-semibold">Cancelar Compra</h2>

          <p className="mt-4 text-center text-sm leading-6 text-zinc-400">
            Ao cancelar esta compra, todos os dados informados serão perdidos.
          </p>

          <p className="mt-1 text-center text-sm font-medium">
            Deseja continuar?
          </p>
        </div>

        <div className="flex gap-3 border-t border-zinc-800 p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-lg border border-zinc-700 py-3 font-medium transition hover:bg-zinc-800 disabled:opacity-60"
          >
            Permanecer
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 py-3 font-medium transition hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Cancelando...
              </>
            ) : (
              "Cancelar Compra"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
