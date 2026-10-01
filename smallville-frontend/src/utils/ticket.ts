import type { TicketType } from "@/src/types/ticket";

/** Rótulos exibidos para o usuário. Os valores são os do enum do backend. */
export const TICKET_TYPE_LABELS: Record<TicketType, string> = {
  INTEIRA: "Inteira",
  MEIA: "Meia-entrada",
};

export const TICKET_TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "INTEIRA", label: TICKET_TYPE_LABELS.INTEIRA },
  { value: "MEIA", label: TICKET_TYPE_LABELS.MEIA },
];

/** Preço do ingresso a partir do preço da sessão, em centavos. */
export function ticketPriceFromSession(
  sessionPriceInCents: number | undefined,
  type: TicketType,
): number {
  const price = sessionPriceInCents ?? 0;

  return type === "MEIA" ? Math.round(price / 2) : price;
}

/** Preço do ingresso pela tabela do backend, com o preço da sessão como reserva. */
export function resolveTicketPrice(
  prices: Partial<Record<TicketType, number>> | undefined,
  sessionPriceInCents: number | undefined,
  type: TicketType,
): number {
  const configured = prices?.[type];

  if (typeof configured === "number") return configured;

  return ticketPriceFromSession(sessionPriceInCents, type);
}
