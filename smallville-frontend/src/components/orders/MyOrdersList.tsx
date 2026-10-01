"use client";

import { useEffect, useMemo, useState } from "react";
import type { Order, OrderStatus } from "@/src/types/order";
import AdminPagination from "@/src/components/admin/AdminPagination";
import { useQueryParams } from "@/src/hooks/useQueryParams";
import OrderCard from "./OrderCard";

const FILTERS: { value: OrderStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pagamento_aprovado", label: "Aprovados" },
  { value: "pagamento_pendente", label: "Pendentes" },
  { value: "pagamento_recusado", label: "Recusados" },
  { value: "pedido_cancelado", label: "Cancelados" },
];

interface MyOrdersListProps {
  orders: Order[];
  /** Visão de administrador: mostra o titular e habilita a busca. */
  admin?: boolean;
  emptyMessage?: string;
  /** Paginação vinda do servidor. */
  page: number;
  limit: number;
  total: number;
}

/** Listagem de pedidos, paginada pelo servidor. */
export default function MyOrdersList({
  orders,
  admin = false,
  emptyMessage = "Você ainda não fez nenhum pedido.",
  page,
  limit,
  total,
}: MyOrdersListProps) {
  const { searchParams, update, isPending } = useQueryParams();

  const filter = (searchParams.get("status") ?? "all") as OrderStatus | "all";
  const queryTerm = searchParams.get("q") ?? "";

  // A busca filtra na hora pelo estado local; a URL é atualizada depois, com
  // uma pausa, só para o termo sobreviver à troca de página. Sem a pausa cada
  // tecla digitada viraria uma navegação.
  const [search, setSearch] = useState(queryTerm);

  useEffect(() => {
    if (search === queryTerm) return;

    const timer = setTimeout(() => update({ q: search || null }), 350);

    return () => clearTimeout(timer);
  }, [search, queryTerm, update]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return orders;

    return orders.filter((order) =>
      [
        order.id,
        order.movieTitle,
        order.user?.name,
        order.user?.email,
        order.cinemaName,
        order.roomName,
        ...order.seats.map((seat) => seat.seatNumber),
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [orders, search]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={filter === option.value}
              disabled={isPending}
              onClick={() =>
                update({
                  status: option.value === "all" ? null : option.value,
                  // Filtro novo recomeça da primeira página: a página 3 do
                  // filtro anterior pode não existir no novo recorte.
                  page: null,
                })
              }
              className={`shrink-0 cursor-pointer rounded-lg border px-4 py-2 text-xs font-bold transition-all disabled:cursor-not-allowed ${
                filter === option.value
                  ? "border-red-cinema bg-red-cinema text-white"
                  : "border-grayScale-600 bg-gray-surface text-grayScale-400 hover:border-red-cinema hover:text-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {admin && (
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar nesta página: usuário, filme, assento ou ID"
            aria-label="Buscar pedidos nesta página"
            className="w-full rounded-lg border border-grayScale-600 bg-gray-surface px-4 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema sm:w-80"
          />
        )}
      </div>

      {!orders.length ? (
        <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-10 text-center text-sm text-grayScale-400">
          {filter === "all" ? emptyMessage : "Nenhum pedido com esse status."}
        </p>
      ) : !visible.length ? (
        <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-10 text-center text-sm text-grayScale-400">
          Nenhum pedido desta página corresponde à busca.
        </p>
      ) : (
        <div className={`flex flex-col gap-4 ${isPending ? "opacity-60" : ""}`}>
          {visible.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              showUser={admin}
              showActions={!admin}
              showApprove={admin}
            />
          ))}
        </div>
      )}

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        itemLabel="pedidos"
      />
    </div>
  );
}
