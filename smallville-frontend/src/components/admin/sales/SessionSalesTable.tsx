"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import TuneIcon from "@mui/icons-material/Tune";
import { updateSessionSales } from "@/src/actions/admin/salesControlActions";
import {
  SalesControlSession,
  SALES_STATUS_LABELS,
  SALES_STATUS_TONES,
  SALES_STATUSES,
  SalesStatus,
  occupancyRate,
} from "@/src/types/sales-control";
import { brFormToIso, brToIsoDate, parseBrDateTime } from "@/src/utils/date";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS, ticketPriceFromSession } from "@/src/utils/ticket";
import AdminTable from "../AdminTable";
import AdminModal from "../AdminModal";
import AdminField, { adminInputClass } from "../AdminField";
import Button from "../../ui/Button";

interface Props {
  sessions: SalesControlSession[];
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

interface SalesForm {
  enabled: boolean;
  /** "AAAA-MM-DD" do input type="date". */
  startDate: string;
  /** "HH:MM" do input type="time". */
  startTime: string;
  endDate: string;
  endTime: string;
}

const EMPTY_FORM: SalesForm = {
  enabled: true,
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
};

/** "DD/MM/AAAA HH:MM" → campos do formulário. */
function splitDateTime(value?: string): { date: string; time: string } {
  const [datePart, timePart] = value?.split(" ") ?? [];

  return {
    date: datePart ? brToIsoDate(datePart) : "",
    time: timePart ?? "",
  };
}

/** Campos do formulário → instante ISO, que é o que o backend valida. */
function joinDateTime(date: string, time: string): string | null {
  return brFormToIso(date, time);
}

/** Situação de venda quando o backend ainda não a calcula. */
function fallbackStatus(session: SalesControlSession): SalesStatus {
  if (session.salesStatus) return session.salesStatus;

  const now = new Date();

  if (session.salesEnabled === false) return SALES_STATUSES.ENCERRADA;

  const start = session.salesStartAt
    ? parseBrDateTime(session.salesStartAt)
    : null;

  if (start && now < start) return SALES_STATUSES.NAO_INICIADA;

  const end = session.salesEndAt ? parseBrDateTime(session.salesEndAt) : null;
  const sessionStart = parseBrDateTime(session.dateTime);

  if ((end && now > end) || (sessionStart && now > sessionStart)) {
    return SALES_STATUSES.EXPIRADA;
  }

  if (
    session.seatsTotal &&
    session.seatsOccupied !== undefined &&
    session.seatsOccupied >= session.seatsTotal
  ) {
    return SALES_STATUSES.ESGOTADA;
  }

  return SALES_STATUSES.DISPONIVEL;
}

/** Grade de sessões com o estado de venda. */
export default function SessionSalesTable({
  sessions,
  onSaved,
  onError,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editing, setEditing] = useState<SalesControlSession | null>(null);
  const [form, setForm] = useState<SalesForm>(EMPTY_FORM);
  const [statusFilter, setStatusFilter] = useState<"todas" | SalesStatus>(
    "todas",
  );

  const rows = useMemo(() => {
    const withStatus = sessions.map((session) => ({
      session,
      status: fallbackStatus(session),
    }));

    const filtered =
      statusFilter === "todas"
        ? withStatus
        : withStatus.filter((row) => row.status === statusFilter);

    // Sessão mais próxima primeiro: é a que o administrador precisa decidir.
    return filtered.sort((a, b) => {
      const first = parseBrDateTime(a.session.dateTime)?.getTime() ?? 0;
      const second = parseBrDateTime(b.session.dateTime)?.getTime() ?? 0;

      return first - second;
    });
  }, [sessions, statusFilter]);

  function openEditor(session: SalesControlSession) {
    const start = splitDateTime(session.salesStartAt);
    const end = splitDateTime(session.salesEndAt);

    setForm({
      enabled: session.salesEnabled !== false,
      startDate: start.date,
      startTime: start.time,
      endDate: end.date,
      endTime: end.time,
    });

    setEditing(session);
  }

  function save() {
    if (!editing) return;

    const salesStartAt = joinDateTime(form.startDate, form.startTime);
    const salesEndAt = joinDateTime(form.endDate, form.endTime);

    if (salesStartAt && salesEndAt) {
      const start = new Date(salesStartAt);
      const end = new Date(salesEndAt);

      if (end <= start) {
        onError("O fim das vendas deve ser depois do início.");
        return;
      }
    }

    startTransition(async () => {
      const result = await updateSessionSales(editing.id, {
        salesEnabled: form.enabled,
        salesStartAt,
        salesEndAt,
      });

      if (!result.success) {
        onError(result.error);
        return;
      }

      setEditing(null);
      onSaved(`Venda da sessão ${editing.dateTime} atualizada.`);
      router.refresh();
    });
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">Sessões</h3>

          <p className="mt-1 text-xs text-grayScale-400">
            Controle a disponibilidade e o período de venda de cada sessão.
          </p>
        </div>

        <AdminField label="Situação" htmlFor="sales-status-filter">
          <select
            id="sales-status-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as "todas" | SalesStatus)
            }
            className={`${adminInputClass} w-52`}
          >
            <option value="todas">Todas</option>

            {Object.entries(SALES_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </AdminField>
      </div>

      <AdminTable
        rows={rows}
        rowKey={(row) => row.session.id}
        emptyMessage="Nenhuma sessão para esta situação."
        actions={[
          {
            icon: <TuneIcon className="text-[18px]" />,
            label: "Configurar venda",
            onClick: (row) => openEditor(row.session),
          },
        ]}
        columns={[
          {
            header: "Sessão",
            render: ({ session }) => (
              <div>
                <span className="font-bold text-white">
                  {session.movieTitle}
                </span>

                <p className="text-xs text-grayScale-400">
                  {session.dateTime} · {session.roomName} ({session.roomType}) ·{" "}
                  {session.language}
                </p>

                {session.cinemaName && (
                  <p className="text-xs text-grayScale-400">
                    {session.cinemaName}
                  </p>
                )}
              </div>
            ),
          },
          {
            header: "Preços",
            render: ({ session }) => {
              const prices = session.effectivePrices ?? {
                INTEIRA: session.price,
                MEIA: ticketPriceFromSession(session.price, "MEIA"),
              };

              return (
                <div className="text-xs">
                  <p>
                    {TICKET_TYPE_LABELS.INTEIRA}:{" "}
                    <span className="font-bold text-white">
                      {formatCents(prices.INTEIRA)}
                    </span>
                  </p>

                  <p className="text-grayScale-400">
                    {TICKET_TYPE_LABELS.MEIA}: {formatCents(prices.MEIA)}
                  </p>
                </div>
              );
            },
          },
          {
            header: "Ocupação",
            render: ({ session }) => {
              const rate = occupancyRate(session);

              if (rate === null) {
                return <span className="text-xs text-grayScale-400">—</span>;
              }

              return (
                <div className="min-w-24">
                  <span className="text-xs font-bold text-white">{rate}%</span>

                  <p className="text-[11px] text-grayScale-400">
                    {session.seatsOccupied ?? 0}/{session.seatsTotal} assentos
                  </p>
                </div>
              );
            },
          },
          {
            header: "Período de venda",
            render: ({ session }) => (
              <div className="text-xs text-grayScale-400">
                <p>Início: {session.salesStartAt ?? "imediato"}</p>
                <p>Fim: {session.salesEndAt ?? "até a sessão"}</p>
              </div>
            ),
          },
          {
            header: "Status",
            /* Bolinha como elemento, e não emoji: emoji é texto e caía sobre o rótulo. */
            render: ({ status }) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${SALES_STATUS_TONES[status]}`}
              >
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full bg-current"
                />

                {SALES_STATUS_LABELS[status]}
              </span>
            ),
          },
        ]}
      />

      <AdminModal
        open={!!editing}
        title="Controle de venda da sessão"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setEditing(null)}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button onClick={save} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="flex flex-col gap-5">
            <div className="rounded-lg border border-grayScale-600 bg-deep-black p-4">
              <p className="font-bold text-white">{editing.movieTitle}</p>

              <p className="mt-1 text-xs text-grayScale-400">
                {editing.dateTime} · {editing.roomName} ·{" "}
                {editing.cinemaName ?? "cinema"}
              </p>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-grayScale-600 p-4">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) =>
                  setForm({ ...form, enabled: event.target.checked })
                }
                className="h-4 w-4 accent-[#e50914]"
              />

              <span>
                <span className="block text-sm font-bold">
                  Venda liberada para esta sessão
                </span>

                <span className="block text-xs text-grayScale-400">
                  Desmarcado, o backend recusa qualquer novo pedido para ela.
                </span>
              </span>
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AdminField
                label="Início das vendas"
                htmlFor="sales-start-date"
                hint="Em branco: vendas abertas desde já."
              >
                <div className="flex gap-2">
                  <input
                    id="sales-start-date"
                    type="date"
                    value={form.startDate}
                    onChange={(event) =>
                      setForm({ ...form, startDate: event.target.value })
                    }
                    className={adminInputClass}
                  />

                  <input
                    type="time"
                    aria-label="Hora de início das vendas"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm({ ...form, startTime: event.target.value })
                    }
                    className={`${adminInputClass} w-32`}
                  />
                </div>
              </AdminField>

              <AdminField
                label="Fim das vendas"
                htmlFor="sales-end-date"
                hint="Em branco: vende até o início da sessão."
              >
                <div className="flex gap-2">
                  <input
                    id="sales-end-date"
                    type="date"
                    value={form.endDate}
                    onChange={(event) =>
                      setForm({ ...form, endDate: event.target.value })
                    }
                    className={adminInputClass}
                  />

                  <input
                    type="time"
                    aria-label="Hora de fim das vendas"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm({ ...form, endTime: event.target.value })
                    }
                    className={`${adminInputClass} w-32`}
                  />
                </div>
              </AdminField>
            </div>
          </div>
        )}
      </AdminModal>
    </section>
  );
}
