import { SeatType } from "@/src/types/session-types";

export interface BackendSeat {
  seatNumber: string;
  type: "COMUM" | "PREFERENCIAL" | "CADEIRANTE" | "ACOMPANHANTE_PCD" | "OBESO";
  isOccupied: boolean;
}

export interface SeatCellData {
  seatNumber: string;
  type: SeatType;
  isOccupied: boolean;
  id?: string;
}

export interface SeatRow {
  row: string;
  seats: (SeatCellData | null)[];
}

const TYPE_MAP: Record<BackendSeat["type"], SeatType> = {
  COMUM: "comum",
  PREFERENCIAL: "preferencial",
  CADEIRANTE: "cadeirante",
  ACOMPANHANTE_PCD: "acompanhante",
  OBESO: "obesa",
};

const ROW_ORDER = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L"];

function toCell(seat: BackendSeat): SeatCellData {
  return {
    seatNumber: seat.seatNumber,
    type: TYPE_MAP[seat.type],
    isOccupied: seat.isOccupied,
  };
}

function parseSeatNumber(
  seatNumber: string,
): { letter: string; number: number } | null {
  const match = seatNumber.match(/^([A-Z])(\d+)$/);
  if (!match) return null;

  const [, letter, numberStr] = match;
  if (!letter || !numberStr) return null;

  return { letter, number: Number(numberStr) };
}

export function buildSeatLayout(seats: BackendSeat[]): SeatRow[] {
  const grouped = new Map<string, SeatCellData[]>();

  seats.forEach((seat) => {
    const parsed = parseSeatNumber(seat.seatNumber);
    if (!parsed) return;

    const list = grouped.get(parsed.letter) ?? [];
    list.push(toCell(seat));
    grouped.set(parsed.letter, list);
  });

  grouped.forEach((list) => {
    list.sort((a, b) => {
      const numA = parseSeatNumber(a.seatNumber)?.number ?? 0;
      const numB = parseSeatNumber(b.seatNumber)?.number ?? 0;
      return numA - numB;
    });
  });

  return ROW_ORDER.map((letter) => ({
    row: letter,
    seats: letter === "F" ? [] : (grouped.get(letter) ?? []),
  })).filter((r) => r.row === "F" || r.seats.length > 0);
}
