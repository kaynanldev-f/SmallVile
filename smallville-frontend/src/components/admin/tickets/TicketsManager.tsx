"use client";

import { useEffect, useMemo, useState } from "react";
import AdminTable, { AdminColumn } from "../AdminTable";
import AdminPagination from "../AdminPagination";
import { Ticket, TicketStatus } from "@/src/types/ticket";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS } from "@/src/utils/ticket";
import { useQueryParams } from "@/src/hooks/useQueryParams";

const STATUS_LABELS: Record<TicketStatus, string> = {
  valido: "Válido",
  utilizado: "Utilizado",
  cancelado: "Cancelado",
};

const STATUS_CLASSES: Record<TicketStatus, string> = {
  valido: "border-green-500/40 bg-green-500/10 text-green-300",
  utilizado: "border-grayScale-600 bg-grayScale-700 text-grayScale-400",
  cancelado: "border-red-500/40 bg-red-500/10 text-red-300",
};

interface TicketsManagerProps {
  tickets: Ticket[];
  /** Paginação da API (`GET /tickets?page=&limit=`). */
  page: number;
  limit: number;
  total: number;
}

/** Listagem administrativa de ingressos, 10 por página. */
export default function TicketsManager({
  tickets,
  page,
  limit,
  total,
}: TicketsManagerProps) {
  const { searchParams, update, isPending } = useQueryParams();

  const onlyValid = searchParams.get("status") === "valido";
  const queryTerm = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(queryTerm);

  useEffect(() => {
    if (search === queryTerm) return;

    const timer = setTimeout(() => update({ q: search || null }), 350);

    return () => clearTimeout(timer);
  }, [search, queryTerm, update]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return tickets;

    return tickets.filter((ticket) => {
      return [
        ticket.code,
        ticket.movieTitle,
        ticket.seatNumber,
        ticket.holderName,
        ticket.holderEmail,
        ticket.cinemaName,
        ticket.roomName,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term));
    });
  }, [tickets, search]);

  const columns: AdminColumn<Ticket>[] = [
    {
      header: "Código",
      render: (ticket) => (
        <span className="font-mono text-xs">{ticket.code}</span>
      ),
    },
    {
      header: "Usuário",
      render: (ticket) => (
        <div className="min-w-0">
          <p className="truncate font-bold">{ticket.holderName ?? "—"}</p>

          {ticket.holderEmail && (
            <p className="truncate text-xs text-grayScale-400">
              {ticket.holderEmail}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "Filme",
      render: (ticket) => ticket.movieTitle,
    },
    {
      header: "Sessão",
      render: (ticket) => (
        <div>
          <p>{ticket.sessionDateTime}</p>

          <p className="text-xs text-grayScale-400">
            {[ticket.cinemaName, ticket.roomName].filter(Boolean).join(" · ")}
          </p>
        </div>
      ),
    },
    {
      header: "Assento",
      render: (ticket) => (
        <span>
          {ticket.seatNumber}
          <span className="ml-1 text-xs text-grayScale-400">
            ({TICKET_TYPE_LABELS[ticket.type] ?? ticket.type})
          </span>
        </span>
      ),
    },
    {
      header: "Valor",
      render: (ticket) => formatCents(ticket.price),
    },
    {
      header: "Status",
      render: (ticket) => (
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${STATUS_CLASSES[ticket.status]}`}
        >
          {STATUS_LABELS[ticket.status]}
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          aria-pressed={onlyValid}
          disabled={isPending}
          onClick={() =>
            update({ status: onlyValid ? null : "valido", page: null })
          }
          className={`w-fit shrink-0 cursor-pointer rounded-lg border px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed ${
            onlyValid
              ? "border-red-cinema bg-red-cinema text-white"
              : "border-grayScale-600 bg-gray-surface text-grayScale-400 hover:border-red-cinema hover:text-white"
          }`}
        >
          Somente válidos
        </button>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar nesta página: código, usuário, filme ou assento"
          aria-label="Buscar ingressos nesta página"
          className="w-full rounded-lg border border-grayScale-600 bg-gray-surface px-4 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema sm:w-80"
        />
      </div>

      <div className={isPending ? "opacity-60" : ""}>
        <AdminTable
          rows={rows}
          columns={columns}
          rowKey={(ticket) => ticket._id}
          emptyMessage={
            search
              ? "Nenhum ingresso desta página corresponde à busca."
              : "Nenhum ingresso encontrado."
          }
        />
      </div>

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        itemLabel="ingressos"
      />
    </div>
  );
}
