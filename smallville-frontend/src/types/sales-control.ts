/** Contrato do controle de venda de ingressos — espelhado do backend. */

import type { TicketType } from "./ticket";

/** Domingo = 0, como `Date.prototype.getDay()`. Mesmo índice no backend. */
export const WEEKDAYS = [
  { value: 0, label: "Domingo", short: "Dom" },
  { value: 1, label: "Segunda", short: "Seg" },
  { value: 2, label: "Terça", short: "Ter" },
  { value: 3, label: "Quarta", short: "Qua" },
  { value: 4, label: "Quinta", short: "Qui" },
  { value: 5, label: "Sexta", short: "Sex" },
  { value: 6, label: "Sábado", short: "Sáb" },
] as const;

export type Weekday = (typeof WEEKDAYS)[number]["value"];

export function weekdayLabel(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.label ?? "—";
}

export function weekdayShortLabel(weekday: number): string {
  return WEEKDAYS.find((day) => day.value === weekday)?.short ?? "—";
}

/** Preço de cada tipo de ingresso, em centavos. */
export type TicketPriceSet = Record<TicketType, number>;

/** Regra de preço de um dia da semana. */
export interface WeekdayPriceRule {
  weekday: Weekday;
  enabled: boolean;
  prices: TicketPriceSet;
}

/** Tabela de preços do cinema. */
export interface TicketPricingConfig {
  defaultPrices: TicketPriceSet;
  weekdayRules: WeekdayPriceRule[];
  /** ISO do último salvamento. */
  updatedAt?: string;
}

/** Tabela como a tela a edita; gravada como regras em `/sales-control/price-rules`. */
export interface TicketPricingInput {
  defaultPrices: TicketPriceSet;
  weekdayRules: WeekdayPriceRule[];
}

export const SALES_STATUSES = {
  /** Vendendo agora. */
  DISPONIVEL: "disponivel",
  /** Dentro do período, mas o administrador desligou a venda. */
  ENCERRADA: "encerrada",
  /** Ainda não abriu (`salesStartAt` no futuro). */
  NAO_INICIADA: "nao_iniciada",
  /** Passou de `salesEndAt` ou a sessão já começou. */
  EXPIRADA: "expirada",
  /** Todos os assentos ocupados. */
  ESGOTADA: "esgotada",
} as const;

export type SalesStatus =
  (typeof SALES_STATUSES)[keyof typeof SALES_STATUSES];

export const SALES_STATUS_LABELS: Record<SalesStatus, string> = {
  disponivel: "Disponível",
  encerrada: "Venda encerrada",
  nao_iniciada: "Vendas não iniciadas",
  expirada: "Período encerrado",
  esgotada: "Esgotada",
};

/** Cor do indicador na tela, seguindo o padrão do dashboard. */
export const SALES_STATUS_TONES: Record<SalesStatus, string> = {
  disponivel: "border-green-500/40 bg-green-500/10 text-green-400",
  encerrada: "border-red-500/40 bg-red-500/10 text-red-400",
  nao_iniciada: "border-yellow-500/40 bg-yellow-500/10 text-yellow-300",
  expirada: "border-grayScale-600 bg-grayScale-700 text-grayScale-400",
  esgotada: "border-red-cinema/40 bg-red-cinema/10 text-red-cinema",
};

/** Estado de venda da sessão, devolvido junto dela nas rotas de sessão. */
export interface SessionSalesInfo {
  /** Chave que o administrador liga e desliga. */
  salesEnabled?: boolean;
  /** "DD/MM/AAAA HH:MM" — início das vendas (convertido do ISO do backend). */
  salesStartAt?: string;
  /** "DD/MM/AAAA HH:MM" — fim das vendas. */
  salesEndAt?: string;
  /** Situação já resolvida pelo backend, considerando data, chave e lotação. */
  salesStatus?: SalesStatus;
  /** Preços aplicados a esta sessão hoje, em centavos. */
  effectivePrices?: TicketPriceSet;
  /** Assentos totais e ocupados — base da ocupação exibida. */
  seatsTotal?: number;
  seatsOccupied?: number;
}

/** Payload de `PATCH /sales-control/sessions/:id`. */
export interface SessionSalesInput {
  salesEnabled: boolean;
  /** Instante ISO 8601, ou null para remover o limite. */
  salesStartAt: string | null;
  salesEndAt: string | null;
}

/** Sessão como a tela de Controle de Vendas precisa dela. */
export interface SalesControlSession extends SessionSalesInfo {
  id: string;
  movieTitle: string;
  cinemaId: string;
  cinemaName?: string;
  roomName: string;
  roomType: string;
  language: string;
  /** "DD/MM/AAAA HH:MM" */
  dateTime: string;
  /** Preço próprio da sessão, em centavos. */
  price: number;
}

/** A venda está aberta? */
export function isSessionOnSale(session: SessionSalesInfo): boolean {
  if (session.salesStatus) {
    return session.salesStatus === SALES_STATUSES.DISPONIVEL;
  }

  // Sessão sem controle configurado continua vendendo, como antes.
  return session.salesEnabled !== false;
}

/** Ocupação em porcentagem inteira. Retorna null quando não há mapa de assentos. */
export function occupancyRate(session: SessionSalesInfo): number | null {
  if (!session.seatsTotal) return null;

  return Math.round(((session.seatsOccupied ?? 0) / session.seatsTotal) * 100);
}

/* ------------ Adaptação do formato aninhado do backend ------------------ */

/** `session.pricing` — preço vigente resolvido pelo servidor. */
export interface BackendSessionPricing {
  fullPrice: number;
  halfPrice: number;
  source?: "sessao" | "regra" | "padrao";
  appliedRule?: {
    id: string;
    name: string;
    weekday: number | null;
    weekdayLabel: string;
  };
}

/** `session.sales` — situação da venda decidida pelo servidor. */
export interface BackendSessionSales {
  enabled: boolean;
  onSale: boolean;
  reason?: string;
  /** ISO 8601 ou null. */
  startsAt?: string | null;
  endsAt?: string | null;
}

/** A parte de uma sessão do backend que interessa ao controle de venda. */
export interface BackendSessionSalesEnvelope {
  price?: number;
  pricing?: BackendSessionPricing;
  sales?: BackendSessionSales;
  seats?: { isOccupied?: boolean }[];
}

/** Situação da venda a partir do envelope do backend. */
function resolveSalesStatus(
  sales: BackendSessionSales | undefined,
  seatsTotal: number | undefined,
  seatsOccupied: number | undefined,
  now: Date = new Date(),
): SalesStatus | undefined {
  if (!sales) return undefined;

  if (!sales.enabled) return SALES_STATUSES.ENCERRADA;

  const startsAt = sales.startsAt ? new Date(sales.startsAt) : null;

  if (startsAt && !Number.isNaN(startsAt.getTime()) && now < startsAt) {
    return SALES_STATUSES.NAO_INICIADA;
  }

  const endsAt = sales.endsAt ? new Date(sales.endsAt) : null;

  if (endsAt && !Number.isNaN(endsAt.getTime()) && now > endsAt) {
    return SALES_STATUSES.EXPIRADA;
  }

  if (seatsTotal && seatsOccupied !== undefined && seatsOccupied >= seatsTotal) {
    return SALES_STATUSES.ESGOTADA;
  }

  return sales.onSale ? SALES_STATUSES.DISPONIVEL : SALES_STATUSES.ENCERRADA;
}

/** Envelope do backend → `SessionSalesInfo`, o formato que as telas usam. */
export function toSessionSalesInfo(
  raw: BackendSessionSalesEnvelope,
  isoToBrDateTime: (value?: string | null) => string | undefined,
): SessionSalesInfo {
  const seatsTotal = raw.seats?.length;
  const seatsOccupied = raw.seats?.filter((seat) => seat.isOccupied).length;

  return {
    salesEnabled: raw.sales?.enabled,
    salesStartAt: isoToBrDateTime(raw.sales?.startsAt),
    salesEndAt: isoToBrDateTime(raw.sales?.endsAt),
    salesStatus: resolveSalesStatus(raw.sales, seatsTotal, seatsOccupied),
    effectivePrices: raw.pricing
      ? { INTEIRA: raw.pricing.fullPrice, MEIA: raw.pricing.halfPrice }
      : undefined,
    seatsTotal,
    seatsOccupied,
  };
}
