"use client";

import clsx from "clsx";
import { formatDayLabel } from "@/src/utils/date";

interface SessionDateFilterProps {
  dates: string[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export default function SessionDateFilter({
  dates,
  selectedDate,
  onSelectDate,
}: SessionDateFilterProps) {
  if (!dates.length) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {dates.map((date) => {
        const isSelected = date === selectedDate;

        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelectDate(date)}
            aria-pressed={isSelected}
            className={clsx(
              "shrink-0 rounded-lg border px-4 py-2 text-xs font-bold transition-all cursor-pointer",
              isSelected
                ? "border-red-cinema bg-red-cinema text-white"
                : "border-grayScale-600 bg-gray-surface text-grayScale-400 hover:border-red-cinema hover:text-white",
            )}
          >
            <span className="block">{formatDayLabel(date)}</span>
            <span className="block text-[10px] font-normal opacity-70">
              {date}
            </span>
          </button>
        );
      })}
    </div>
  );
}
