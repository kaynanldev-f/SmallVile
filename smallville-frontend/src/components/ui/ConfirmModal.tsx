"use client";

import { createPortal } from "react-dom";
import { ConfirmModalProps } from "@/src/types";

/** Modal de confirmação do sistema (saída da conta, exclusão de conta). */
export function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  isPending = false,
  icon,
  confirmButtonText = "Confirmar",
  cancelButtonText = "Cancelar",
  confirmButtonClassName = "",
  cancelButtonClassName = "",
}: ConfirmModalProps) {
  if (!isOpen || typeof document === "undefined") return null;

  const baseButtonClass =
    "py-2.5 px-5 rounded-lg font-nunito font-bold transition-colors cursor-pointer min-w-32 text-center shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-surface disabled:cursor-not-allowed disabled:opacity-50";

  const defaultCancelClass =
    "text-grayScale-200 bg-grayScale-700 border border-grayScale-600 hover:bg-grayScale-600 hover:text-white focus-visible:ring-grayScale-400";
  const finalCancelClass = cancelButtonClassName
    ? `${baseButtonClass} ${cancelButtonClassName}`
    : `${baseButtonClass} ${defaultCancelClass}`;

  const defaultConfirmClass =
    "text-white bg-red-cinema border border-red-cinema hover:bg-button-primary-hover focus-visible:ring-red-cinema";
  const finalConfirmClass = confirmButtonClassName
    ? `${baseButtonClass} ${confirmButtonClassName}`
    : `${baseButtonClass} ${defaultConfirmClass}`;

  const modalContent = (
    <div
      className="fixed inset-0 z-99 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 transition-opacity animate-in fade-in"
      onClick={!isPending ? onCancel : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="bg-gray-surface border border-grayScale-600 rounded-xl p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {icon && <div className="mb-4 text-red-cinema">{icon}</div>}

        <h2 className="text-xl text-white font-nunito font-bold">{title}</h2>

        {message && (
          <p className="mt-3 text-sm text-grayScale-400 font-nunito">
            {message}
          </p>
        )}

        <div className="mt-8 flex gap-4 justify-center w-full">
          <button
            onClick={onConfirm}
            disabled={isPending}
            className={finalConfirmClass}
          >
            {confirmButtonText}
          </button>

          <button
            onClick={onCancel}
            disabled={isPending}
            className={finalCancelClass}
          >
            {cancelButtonText}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
