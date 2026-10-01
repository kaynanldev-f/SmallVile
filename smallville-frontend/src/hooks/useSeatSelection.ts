"use client";

import { useState } from "react";
import { SeatType } from "../types/session-types";
import { TicketType } from "../types/ticket";

export interface SelectedSeat {
  seatNumber: string;
  type: TicketType;
}

export function useSeatSelection(initialSelected: string[] = []) {
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>(
    initialSelected.map((seat) => ({
      seatNumber: seat,
      type: "INTEIRA",
    })),
  );

  const toggleSeat = (
    seatNumber: string,
    seatType: SeatType,
    ticketType: TicketType = "INTEIRA",
  ) => {
    if (seatType === "indisponivel") return;

    setSelectedSeats((prev) => {
      const exists = prev.find((seat) => seat.seatNumber === seatNumber);

      if (exists) {
        return prev.filter((seat) => seat.seatNumber !== seatNumber);
      }

      return [
        ...prev,
        {
          seatNumber,
          type: ticketType,
        },
      ];
    });
  };

  /** Troca inteira/meia de um assento já selecionado. */
  const setSeatType = (seatNumber: string, ticketType: TicketType) => {
    setSelectedSeats((prev) =>
      prev.map((seat) =>
        seat.seatNumber === seatNumber ? { ...seat, type: ticketType } : seat,
      ),
    );
  };

  return {
    selectedSeats,
    selectedCount: selectedSeats.length,
    toggleSeat,
    setSeatType,
  };
}
