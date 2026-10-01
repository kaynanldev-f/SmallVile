"use client";

import { useMemo, useState } from "react";
import { Ticket, TicketStatus } from "@/src/types/ticket";
import AdminPagination from "@/src/components/admin/AdminPagination";
import TicketStub from "./TicketStub";
import TicketDownloadButton from "./TicketDownloadButton";

/** Os status vêm do backend (valido | utilizado | cancelado). */
const FILTERS: { value: TicketStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "valido", label: "Válidos" },
  { value: "utilizado", label: "Utilizados" },
  { value: "cancelado", label: "Cancelados" },
];

interface TicketsListProps {
  tickets: Ticket[];
  /** Mostra o campo de busca (filme, assento, código ou titular). */
  searchable?: boolean;
  /** Texto exibido quando o usuário ainda não tem nenhum ingresso. */
  emptyMessage?: string;
  /** Paginação, quando a lista vem de uma rota paginada (`GET /tickets`). */
  pagination?: { page: number; limit: number; total: number };
}

export default function TicketsList({
  tickets,
  searchable = false,
  emptyMessage = "Você ainda não tem ingressos. Escolha um filme e garanta o seu.",
  pagination,
}: TicketsListProps) {
  const [filter, setFilter] = useState<TicketStatus | "all">("all");
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    return tickets.filter((ticket) => {
      if (filter !== "all" && ticket.status !== filter) return false;

      if (!term) return true;

      return [
        ticket.movieTitle,
        ticket.seatNumber,
        ticket.code,
        ticket.holderName,
        ticket.holderEmail,
        ticket.cinemaName,
        ticket.roomName,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term));
    });
  }, [tickets, filter, search]);

  if (!tickets.length) {
    return (
      <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-12 text-center text-sm text-grayScale-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={`shrink-0 cursor-pointer rounded-lg border px-4 py-2 text-xs font-bold transition-all ${
                filter === option.value
                  ? "border-red-cinema bg-red-cinema text-white"
                  : "border-grayScale-600 bg-gray-surface text-grayScale-400 hover:border-red-cinema hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {searchable && (
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por filme, titular, assento ou código"
            aria-label="Buscar ingressos"
            className="w-full rounded-lg border border-grayScale-600 bg-gray-surface px-4 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema sm:w-80"
          />
        )}
      </div>

      {!visible.length ? (
        <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-10 text-center text-sm text-grayScale-400">
          {pagination
            ? "Nenhum ingresso desta página corresponde aos filtros."
            : "Nenhum ingresso encontrado com esses filtros."}
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {visible.map((ticket) => (
            <div key={ticket._id} className="flex flex-col gap-3">
              <TicketStub ticket={ticket} />

              <div className="flex justify-end">
                <TicketDownloadButton ticket={ticket} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && (
        <AdminPagination
          page={pagination.page}
          limit={pagination.limit}
          total={pagination.total}
          itemLabel="ingressos"
        />
      )}
    </div>
  );
}
