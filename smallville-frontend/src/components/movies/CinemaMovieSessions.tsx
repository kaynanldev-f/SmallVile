"use client";

import { useMemo, useState } from "react";
import { MovieDetailsResult } from "@/src/types/movie-types";
import {
  SALES_STATUS_LABELS,
  isSessionOnSale,
} from "@/src/types/sales-control";
import { isSessionPast, todayBrDate } from "@/src/utils/date";
import SpinLoader from "../ui/SpinLoader";
import SessionCityFilter from "./SessionCityFilter";
import SessionDateFilter from "./SessionDateFilter";

interface CinemaSessionsProps {
  groups: MovieDetailsResult["groups"];
  dates: MovieDetailsResult["dates"];
  cities: MovieDetailsResult["cities"];
  /** Cidade aplicada no momento; `null` enquanto nenhuma foi escolhida. */
  selectedCity: string | null;
  onSelectCity: (city: string | null) => void;
  /** Verdadeiro enquanto a troca de cidade busca as sessões no backend. */
  loading?: boolean;
  onSelectSession: (id: string) => void;
}

export default function CinemaMovieSessions({
  groups,
  dates,
  cities,
  selectedCity,
  onSelectCity,
  loading = false,
  onSelectSession,
}: CinemaSessionsProps) {
  // Abre no dia atual; se não houver sessão hoje, cai no próximo dia disponível.
  const defaultDate = useMemo(() => {
    const today = todayBrDate();

    return dates.includes(today) ? today : (dates[0] ?? null);
  }, [dates]);

  const [selectedDate, setSelectedDate] = useState<string | null>(defaultDate);

  // O dia escolhido é preservado ao trocar de cidade sempre que a nova cidade
  // também tiver sessão nele; caso contrário volta para o primeiro disponível.
  const activeDate =
    selectedDate && dates.includes(selectedDate) ? selectedDate : defaultDate;

  const visibleGroups = useMemo(() => {
    if (!activeDate) return [];

    return groups
      .map((group) => ({
        ...group,
        showtimes: group.showtimes.filter(
          (showtime) => showtime.date === activeDate,
        ),
      }))
      .filter((group) => group.showtimes.length > 0);
  }, [groups, activeDate]);

  function renderSessions() {
    if (loading) {
      return (
        <div className="flex justify-center py-10">
          <SpinLoader />
        </div>
      );
    }

    if (!selectedCity) {
      return (
        <p className="text-grayScale-400 text-sm">
          Selecione uma cidade para ver os cinemas e horários disponíveis.
        </p>
      );
    }

    if (!visibleGroups.length) {
      return (
        <p className="text-grayScale-400 text-sm">
          Nenhuma sessão disponível nesta cidade para esta data.
        </p>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {visibleGroups.map((group) => (
          <div
            key={group.key}
            className="bg-gray-surface rounded-xl p-6 flex flex-col gap-4 border border-grayScale-600 hover:border-red-cinema transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <h4 className="min-w-0 break-words font-black text-sm">
                {group.cinemaName}
              </h4>
              <span className="shrink-0 text-xs border border-red-cinema text-red-cinema px-2 py-1 rounded">
                {group.roomType}
              </span>
            </div>
            <p className="text-grayScale-400 text-xs flex items-center gap-1 break-words">
              {group.address}
            </p>
            <p className="font-bold text-sm">{group.language}</p>
            <div className="flex gap-2 flex-wrap">
              {group.showtimes.map((showtime) => {
                {
                  /* Sessão com venda encerrada ou já realizada continua na
                     grade, mas sem link — o histórico do dia permanece
                     visível, só a compra é bloqueada. */
                }
                const alreadyStarted = isSessionPast(
                  `${showtime.date} ${showtime.time}`,
                );

                const onSale =
                  !alreadyStarted &&
                  isSessionOnSale({ salesStatus: showtime.salesStatus });

                const blockedReason = alreadyStarted
                  ? "Sessão encerrada"
                  : showtime.salesStatus && !onSale
                    ? SALES_STATUS_LABELS[showtime.salesStatus]
                    : undefined;

                return (
                  <button
                    key={showtime.sessionId}
                    onClick={() => onSelectSession(showtime.sessionId)}
                    disabled={!onSale}
                    title={blockedReason}
                    aria-label={
                      blockedReason
                        ? `${showtime.time} — ${blockedReason}`
                        : undefined
                    }
                    className="px-3 py-1 rounded bg-grayScale-600 hover:bg-red-cinema text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:bg-grayScale-600/40 disabled:text-grayScale-500 disabled:line-through disabled:hover:bg-grayScale-600/40"
                  >
                    {showtime.time}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section>
      <h2 className="text-3xl font-black mb-8">Escolha seu Cinema</h2>

      <div className="mb-8 flex flex-col gap-4">
        <SessionCityFilter
          cities={cities}
          selectedCity={selectedCity}
          onSelectCity={onSelectCity}
          disabled={loading}
        />

        {/* O filtro de dia continua o mesmo; só passa a listar os dias da
            cidade selecionada. */}
        <SessionDateFilter
          dates={dates}
          selectedDate={activeDate}
          onSelectDate={setSelectedDate}
        />
      </div>

      {renderSessions()}
    </section>
  );
}
