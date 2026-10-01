"use client";

import { SeatMapFooterProps } from "@/src/types/session-types";
import { User, MapPin, Calendar, Clock } from "lucide-react";
import Button from "../ui/Button";

export function SeatMapFooter({
  session,
  selectedCount,
  onConfirm,
  isLoading,
  blockedMessage,
}: SeatMapFooterProps) {
  return (
    <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-800 pt-6">
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold tracking-wider text-neutral-300">
        <span className="flex items-center gap-2 bg-[#222] px-3 py-1.5 rounded-md uppercase">
          <User size={14} className="text-neutral-400" /> {session.movieTitle}
        </span>
        <span className="flex items-center gap-2 bg-[#222] px-3 py-1.5 rounded-md uppercase">
          <MapPin size={14} className="text-neutral-400" /> {session.city}
        </span>
        <span className="flex items-center gap-2 bg-[#222] px-3 py-1.5 rounded-md uppercase">
          <Calendar size={14} className="text-neutral-400" /> {session.date}
        </span>
        <span className="flex items-center gap-2 bg-[#222] px-3 py-1.5 rounded-md uppercase">
          <Clock size={14} className="text-neutral-400" /> {session.time},{" "}
          {session.audio}
        </span>
      </div>

      <Button
        type="button"
        onClick={onConfirm}
        disabled={selectedCount === 0 || !!blockedMessage}
        title={blockedMessage}
        className=" disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
      >
        {isLoading ? "Reservando..." : "Continuar"}
      </Button>
    </div>
  );
}
