"use client";

import { useMemo } from "react";
import { SeatIcon } from "./Seat";
import { SeatMapSidebarProps } from "@/src/types/session-types";

export function SeatMapSidebar({
  totalSeatsCount,
  selectedCount,
}: SeatMapSidebarProps) {
  const legendItems = useMemo(
    () => [
      { type: "comum" as const, label: "Poltrona comum" },
      { type: "preferencial" as const, label: "Preferencial" },
      { type: "cadeirante" as const, label: "Cadeirante" },
      { type: "acompanhante" as const, label: "Acompanhante PCD" },
      { type: "obesa" as const, label: "Pessoa obesa" },
      { type: "indisponivel" as const, label: "Indisponível" },
      { type: "selecionado" as const, label: "Selecionado" },
    ],
    [],
  );

  return (
    <div className="flex w-full flex-col gap-4 lg:w-55 shrink-0 mt-12 ">
      <div className="rounded-xl border border-neutral-700 bg-gray-surface/40 p-4">
        <p className="mb-4 text-sm font-bold text-white">Legenda</p>
        <ul className="flex flex-col gap-3">
          {legendItems.map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 text-xs text-neutral-300"
            >
              <div className="w-9 flex justify-center shrink-0">
                <SeatIcon type={item.type} className="h-9 w-7 text-xs" />
              </div>
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-neutral-700 bg-gray-surface/40 p-4">
        <p className="text-sm font-bold text-white">Capacidade da sala</p>
        <p className="mt-1 text-xs text-neutral-400">
          {totalSeatsCount} assentos
        </p>
        {selectedCount > 0 && (
          <p className="mt-2 text-xs font-semibold text-red-500">
            {selectedCount} assento{selectedCount > 1 ? "s" : ""} selecionado
            {selectedCount > 1 ? "s" : ""}
          </p>
        )}
      </div>
    </div>
  );
}
