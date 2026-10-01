"use client";

import React from "react";
import { Accessibility, Check } from "lucide-react";
import { SeatProps, SeatType } from "@/src/types/session-types";

/** Texto lido por leitor de tela e mostrado no title do assento. */
function describeSeat(
  seatNumber: string,
  isDisabled: boolean,
  isSelected: boolean,
): string {
  if (isDisabled) return `Assento ${seatNumber} — ocupado`;

  return `Assento ${seatNumber} — ${isSelected ? "selecionado" : "disponível"}`;
}

export const Seat = React.memo(
  ({ seatNumber, type, isSelected, onClick }: SeatProps) => {
    const isDisabled = type === "indisponivel";

    const baseClasses =
      "flex h-[clamp(26px,3.4vh,44px)] w-[clamp(24px,2.8vw,40px)] items-center justify-center rounded-lg text-sm font-extrabold border shadow-sm transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ";

    /**
     * Três estados bem separados: o disponível é claro e neutro, o hover
     * levanta e tinge a borda de vermelho, e o selecionado troca o fundo
     * inteiro para o vermelho da marca com anel e escala.
     */
    let stateClasses =
      "cursor-pointer border-black/10 bg-white text-black hover:-translate-y-0.5 hover:border-red-cinema hover:bg-neutral-100 hover:shadow-md";

    if (isDisabled) {
      stateClasses =
        "cursor-not-allowed border-black/10 bg-neutral-800 text-neutral-600";
    } else if (isSelected) {
      stateClasses =
        "z-10 scale-110 cursor-pointer border-red-cinema bg-red-cinema text-white shadow-lg shadow-red-cinema/40 ring-2 ring-red-cinema ring-offset-2 ring-offset-[#181818] hover:bg-red-cinema/90";
    }

    const label = describeSeat(seatNumber, isDisabled, isSelected);

    return (
      <button
        type="button"
        disabled={isDisabled}
        onClick={onClick}
        aria-pressed={isDisabled ? undefined : isSelected}
        aria-label={label}
        title={label}
        className={`${baseClasses} ${stateClasses}`}
      >
        <SeatIcon type={type} isSelected={isSelected} />
      </button>
    );
  },
);

Seat.displayName = "Seat";

export function SeatIcon({
  type,
  isSelected,
  className,
}: {
  type: SeatType | "selecionado";
  isSelected?: boolean;
  className?: string;
}) {
  if (type === "selecionado") {
    return (
      <span
        className={`inline-block rounded-lg border border-red-cinema bg-red-cinema ${className ?? "h-11 w-9"}`}
      />
    );
  }

  // No assento comum selecionado o "check" é o que marca a escolha; nos
  // assentos especiais preservamos a letra/ícone, que continua sendo a única
  // indicação do tipo de assento.
  if (isSelected && type === "comum") {
    return <Check size={18} strokeWidth={3} aria-hidden />;
  }

  switch (type) {
    case "preferencial":
      return <span className="text-[15px]">P</span>;
    case "cadeirante":
      return <Accessibility size={18} strokeWidth={2.5} />;
    case "acompanhante":
      return <span className="text-[15px]">A</span>;
    case "obesa":
      return <span className="text-[15px]">O</span>;
    case "indisponivel":
      return <span className="text-[15px]">X</span>;
    case "comum":
    default:
      return className ? (
        <span
          className={`inline-block rounded-lg bg-white border border-black/10 ${className}`}
        />
      ) : null;
  }
}
