"use client";

import { SeatGridProps } from "@/src/types/session-types";
import { Seat } from "./Seat";

export function SeatGrid({
  seatRows,
  selectedSeats,
  toggleSeat,
  screenType,
  room,
}: SeatGridProps) {
  return (
    <div className="w-full flex-1">
      <p className="mb-4 text-center text-xs font-bold tracking-widest text-neutral-300">
        {screenType.toUpperCase()} / {room.toUpperCase()}
      </p>

      <div className="w-full overflow-x-auto pb-4">
        <div className="flex min-w-max flex-col gap-2">
          {seatRows.map(({ row, seats }) => {
            if (row === "F") {
              return <div key="row-F" className="h-4" />;
            }

            return (
              <div
                key={row}
                className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4"
              >
                <span className="w-5 shrink-0 text-center text-xs font-semibold text-neutral-400 sm:text-sm">
                  {row}
                </span>

                <div className="flex gap-1">
                  {seats.map((seat, index) => {
                    if (!seat) {
                      return (
                        <div
                          key={`${row}-${index}`}
                          className="h-8 w-6 sm:h-9 sm:w-7 lg:h-11 lg:w-9"
                        />
                      );
                    }

                    const displayType = seat.isOccupied
                      ? "indisponivel"
                      : seat.type;

                    /**
                     * `seat.id` nunca é preenchido por `buildSeatLayout`,
                     * então esta comparação era sempre falsa e o assento
                     * escolhido jamais chegava a renderizar o estado
                     * selecionado.
                     */
                    const isSelected = selectedSeats.some(
                      (selected) => selected.seatNumber === seat.seatNumber,
                    );

                    return (
                      <Seat
                        key={seat.seatNumber}
                        seatNumber={seat.seatNumber}
                        type={displayType}
                        isSelected={isSelected}
                        onClick={() => toggleSeat(seat.seatNumber, displayType)}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
