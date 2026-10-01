"use client";

import { TicketTypesPanelProps } from "@/src/types/session-types";
import { TicketType } from "@/src/types/ticket";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_OPTIONS, resolveTicketPrice } from "@/src/utils/ticket";

/** Escolha de inteira/meia para cada ingresso da compra. */
export function TicketTypesPanel({
  selectedSeats,
  sessionPrice,
  prices,
  onChangeType,
}: TicketTypesPanelProps) {
  const total = selectedSeats.reduce(
    (sum, seat) => sum + resolveTicketPrice(prices, sessionPrice, seat.type),
    0,
  );

  return (
    <section className="rounded-xl border border-neutral-700 bg-gray-surface/40 p-4">
      <h3 className="text-sm font-bold text-white">Tipo de ingresso</h3>

      {!selectedSeats.length ? (
        <p className="mt-2 text-xs text-neutral-400">
          Selecione os assentos para escolher o tipo de cada ingresso.
        </p>
      ) : (
        <>
          <p className="mt-1 text-xs text-neutral-400">
            Escolha o tipo de cada ingresso. A meia-entrada exige documento
            comprobatório na entrada.
          </p>

          <ul className="mt-4 flex flex-col gap-3">
            {selectedSeats.map((seat, index) => (
              <li key={seat.seatNumber}>
                <fieldset className="rounded-lg border border-neutral-700 bg-[#1f1f1f] p-3">
                  <legend className="px-1 text-[11px] font-bold tracking-wider text-neutral-300 uppercase">
                    Ingresso {index + 1} · Assento {seat.seatNumber}
                  </legend>

                  <div className="mt-1 flex flex-col gap-2 sm:flex-row">
                    {TICKET_TYPE_OPTIONS.map((option) => (
                      <TypeOption
                        key={option.value}
                        seatNumber={seat.seatNumber}
                        value={option.value}
                        label={option.label}
                        price={resolveTicketPrice(
                          prices,
                          sessionPrice,
                          option.value,
                        )}
                        checked={seat.type === option.value}
                        onSelect={() => onChangeType(seat.seatNumber, option.value)}
                      />
                    ))}
                  </div>
                </fieldset>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex items-baseline justify-between border-t border-neutral-700 pt-3">
            <span className="text-xs font-bold text-neutral-300">
              Total dos ingressos
            </span>

            <span className="text-sm font-black text-red-500">
              {formatCents(total)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function TypeOption({
  seatNumber,
  value,
  label,
  price,
  checked,
  onSelect,
}: {
  seatNumber: string;
  value: TicketType;
  label: string;
  price: number;
  checked: boolean;
  onSelect: () => void;
}) {
  /**
   * Radio nativo (apenas visualmente escondido) em vez de um botão com aria-
   * checked: o navegador já entrega navegação por setas dentro do grupo, foco
   * visível e leitura correta pelo leitor de tela.
   */
  return (
    <label
      className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-red-500 ${
        checked
          ? "border-red-500 bg-red-500/10"
          : "border-neutral-700 hover:border-red-500/60"
      }`}
    >
      <input
        type="radio"
        name={`ticket-type-${seatNumber}`}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />

      <span
        aria-hidden="true"
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
          checked ? "border-red-500" : "border-neutral-500"
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-red-500" />}
      </span>

      <span className="min-w-0">
        <span className="block truncate text-xs font-bold text-white">
          {label}
        </span>

        <span className="block text-[11px] text-neutral-400">
          {formatCents(price)}
        </span>
      </span>
    </label>
  );
}
