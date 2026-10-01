"use client";

import { useEffect, useMemo, useState } from "react";
import AdminTable, { AdminColumn } from "../AdminTable";
import AdminPagination from "../AdminPagination";
import { AdminUser } from "@/src/types/user";
import { useQueryParams } from "@/src/hooks/useQueryParams";
import { isoToBrDateTime } from "@/src/utils/date";

interface UsersManagerProps {
  users: AdminUser[];
  /** Paginação da API (`GET /users?page=&limit=`). */
  page: number;
  limit: number;
  total: number;
}

/** Nome completo como o cadastro guarda: nome + sobrenome. */
function fullName(user: AdminUser): string {
  return [user.name, user.surname].filter(Boolean).join(" ") || "—";
}

/** "Cidade/UF" só quando as duas partes existem. */
function location(user: AdminUser): string {
  return [user.city, user.state].filter(Boolean).join("/") || "—";
}

/**
 * Célula de largura limitada: a tabela usa `table-layout: auto`, então um nome
 * (ou e-mail) longo empurraria a coluna indefinidamente. O `max-w` fica no
 * bloco de dentro — em layout automático o navegador ignora `max-width` no
 * próprio `td` — e o `title` mantém o valor completo acessível ao passar o
 * mouse. O texto guardado no backend não muda: isto é só apresentação.
 */
function TruncatedCell({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div
      title={text}
      className={`truncate ${className ?? ""}`}
    >
      {text}
    </div>
  );
}

/** Listagem administrativa de usuários, 10 por página. */
export default function UsersManager({
  users,
  page,
  limit,
  total,
}: UsersManagerProps) {
  const { searchParams, update, isPending } = useQueryParams();

  const queryTerm = searchParams.get("q") ?? "";

  const [search, setSearch] = useState(queryTerm);

  useEffect(() => {
    if (search === queryTerm) return;

    const timer = setTimeout(() => update({ q: search || null }), 350);

    return () => clearTimeout(timer);
  }, [search, queryTerm, update]);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return users;

    return users.filter((user) =>
      [user.name, user.surname, user.email, user.cpf, user.phone, user.city]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(term)),
    );
  }, [users, search]);

  const columns: AdminColumn<AdminUser>[] = [
    {
      header: "Nome",
      render: (user) => (
        <div className="min-w-0">
          <TruncatedCell
            text={fullName(user)}
            className="max-w-[10rem] font-bold text-white sm:max-w-[13rem] lg:max-w-[18rem]"
          />

          {user.birthDate && (
            <p className="text-xs text-grayScale-400">
              Nascimento: {user.birthDate}
            </p>
          )}
        </div>
      ),
    },
    {
      header: "E-mail",
      render: (user) => (
        <TruncatedCell
          text={user.email || "—"}
          className="max-w-[11rem] sm:max-w-[14rem] lg:max-w-[20rem]"
        />
      ),
    },
    {
      header: "Telefone",
      render: (user) => (
        <span className="whitespace-nowrap">{user.phone ?? "—"}</span>
      ),
    },
    {
      header: "Cidade",
      render: (user) => (
        <TruncatedCell
          text={location(user)}
          className="max-w-[8rem] sm:max-w-[10rem] lg:max-w-[14rem]"
        />
      ),
    },
    {
      header: "Cadastro",
      render: (user) => {
        // `createdAt` vem como instante ISO; o resto do sistema mostra
        // "DD/MM/AAAA HH:MM", então a data fica na linha e a hora abaixo.
        const [day, time] = (isoToBrDateTime(user.createdAt) ?? "").split(" ");

        if (!day) return <span className="text-grayScale-400">—</span>;

        return (
          <div className="whitespace-nowrap">
            <p>{day}</p>

            {time && <p className="text-xs text-grayScale-400">{time}</p>}
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar nesta página: nome, e-mail, CPF ou telefone"
          aria-label="Buscar usuários nesta página"
          className="w-full rounded-lg border border-grayScale-600 bg-gray-surface px-4 py-2 text-sm text-grayScale-200 outline-none placeholder:text-grayScale-500 focus:border-red-cinema sm:w-96"
        />
      </div>

      <div className={isPending ? "opacity-60" : ""}>
        <AdminTable
          rows={rows}
          columns={columns}
          rowKey={(user) => user.id}
          emptyMessage={
            search
              ? "Nenhum usuário desta página corresponde à busca."
              : "Nenhum usuário encontrado."
          }
        />
      </div>

      <AdminPagination
        page={page}
        limit={limit}
        total={total}
        itemLabel="usuários"
      />
    </div>
  );
}
