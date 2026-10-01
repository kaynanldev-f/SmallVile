"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import CloseIcon from "@mui/icons-material/Close";

interface AdminModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function AdminModal({
  open,
  title,
  onClose,
  children,
  footer,
}: AdminModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-99 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-2xl rounded-xl border border-grayScale-600 bg-gray-surface text-grayScale-200 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-grayScale-600 px-6 py-4">
          <h2 className="text-lg font-black">{title}</h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer text-grayScale-400 transition-colors hover:text-white"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="px-6 py-5">{children}</div>

        {footer && (
          <div className="flex justify-end gap-3 border-t border-grayScale-600 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
