"use client";

import { IoMdCheckmarkCircle } from "react-icons/io";
import { SuccessModalProps } from "@/src/types";

export function SuccessModal({
  isOpen,
  title = "Parabéns!",
  message,
  onClose,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-10 flex items-center justify-center bg-black/60 p-4 transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg p-5 max-w-sm w-full flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-center">
          <IoMdCheckmarkCircle size={40} color="#27CD27" />
        </div>
        <h2 className="text-xl text-black font-nunito">{title}</h2>
        <p className="text-xl text-black font-nunito">{message}</p>
      </div>
    </div>
  );
}
