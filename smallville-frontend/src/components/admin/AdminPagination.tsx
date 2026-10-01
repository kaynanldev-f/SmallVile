"use client";

import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import { useQueryParams } from "@/src/hooks/useQueryParams";

/** Quantos números de página aparecem de uma vez. */
const WINDOW_SIZE = 5;

interface AdminPaginationProps {
  page: number;
  limit: number;
  /** Total de registros no servidor, não o tamanho da página. */
  total: number;
  /** Nome do recurso no rodapé ("pedidos", "ingressos"). */
  itemLabel?: string;
}

/** Paginação das listagens administrativas. */
export default function AdminPagination({
  page,
  limit,
  total,
  itemLabel = "registros",
}: AdminPaginationProps) {
  const { update, isPending } = useQueryParams();

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(page, 1), totalPages);

  // Uma única página não precisa de controle nenhum.
  if (totalPages <= 1) return null;

  const firstItem = (currentPage - 1) * limit + 1;
  const lastItem = Math.min(currentPage * limit, total);

  const windowStart = Math.max(
    1,
    Math.min(
      currentPage - Math.floor(WINDOW_SIZE / 2),
      totalPages - WINDOW_SIZE + 1,
    ),
  );

  const pages = Array.from(
    { length: Math.min(WINDOW_SIZE, totalPages) },
    (_, offset) => windowStart + offset,
  );

  const goTo = (target: number) => update({ page: target });

  return (
    <nav
      aria-label="Paginação"
      aria-busy={isPending}
      className={`flex flex-col items-center gap-3 sm:flex-row sm:justify-between ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <p className="text-xs text-grayScale-400">
        {isPending ? (
          "Carregando..."
        ) : (
          <>
            Mostrando{" "}
            <span className="font-bold text-grayScale-200">
              {firstItem}–{lastItem}
            </span>{" "}
            de <span className="font-bold text-grayScale-200">{total}</span>{" "}
            {itemLabel} · página {currentPage} de {totalPages}
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <PageButton
          label="Anterior"
          ariaLabel="Página anterior"
          disabled={currentPage <= 1 || isPending}
          onClick={() => goTo(currentPage - 1)}
        >
          <ChevronLeft className="text-[18px]" />
          <span className="hidden sm:inline">Anterior</span>
        </PageButton>

        {pages.map((target) => (
          <button
            key={target}
            type="button"
            onClick={() => goTo(target)}
            disabled={isPending}
            aria-label={`Página ${target}`}
            aria-current={target === currentPage ? "page" : undefined}
            className={`min-w-9 cursor-pointer rounded-md border px-2 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
              target === currentPage
                ? "border-red-cinema bg-red-cinema text-white"
                : "border-grayScale-600 bg-gray-surface text-grayScale-300 hover:border-red-cinema hover:text-white"
            }`}
          >
            {target}
          </button>
        ))}

        <PageButton
          label="Próximo"
          ariaLabel="Próxima página"
          disabled={currentPage >= totalPages || isPending}
          onClick={() => goTo(currentPage + 1)}
        >
          <span className="hidden sm:inline">Próximo</span>
          <ChevronRight className="text-[18px]" />
        </PageButton>
      </div>
    </nav>
  );
}

function PageButton({
  label,
  ariaLabel,
  disabled,
  onClick,
  children,
}: {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={label}
      className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-grayScale-600 bg-gray-surface px-2 py-1.5 text-xs font-bold text-grayScale-300 transition-colors hover:border-red-cinema hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-grayScale-600 disabled:hover:text-grayScale-300"
    >
      {children}
    </button>
  );
}
