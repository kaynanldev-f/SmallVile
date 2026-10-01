/** Contrato do dashboard de vendas — espelhado do backend. */

import type { PaymentMethod } from "./payments";

/** Presets do filtro de período. `personalizado` usa `from`/`to` da URL. */
export const ANALYTICS_PERIODS = {
  TODAY: "hoje",
  LAST_7_DAYS: "7d",
  LAST_30_DAYS: "30d",
  THIS_MONTH: "mes",
  CUSTOM: "personalizado",
} as const;

export type AnalyticsPeriod =
  (typeof ANALYTICS_PERIODS)[keyof typeof ANALYTICS_PERIODS];

export const ANALYTICS_PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  hoje: "Hoje",
  "7d": "7 dias",
  "30d": "30 dias",
  mes: "Este mês",
  personalizado: "Personalizado",
};

/** Intervalo fechado, em "AAAA-MM-DD" — o formato aceito por `from`/`to`. */
export interface AnalyticsRange {
  from: string;
  to: string;
}

export interface AnalyticsSummary {
  /** Em centavos. */
  revenue: number;
  ordersCount: number;
  ticketsCount: number;
  productsCount: number;
  /** Receita ÷ pedidos, em centavos. Já calculado pelo backend. */
  averageOrderValue: number;
}

export interface RevenuePoint {
  /** "AAAA-MM-DD". */
  date: string;
  revenue: number;
  orders: number;
  tickets: number;
}

export interface WeekdayPoint {
  /** Domingo = 0. */
  weekday: number;
  revenue: number;
  orders: number;
  tickets: number;
}

export interface MovieRanking {
  movieId?: string;
  title: string;
  tickets: number;
  revenue: number;
  /** Sessões que tiveram venda no período. */
  sessions?: number;
  /** Ocupação média em porcentagem inteira, quando o backend calcular. */
  occupancy?: number;
}

export interface CinemaRanking {
  cinemaId?: string;
  name: string;
  tickets: number;
  revenue: number;
}

export interface ProductRanking {
  productId?: string;
  name: string;
  quantity: number;
  revenue: number;
}

export interface PaymentMethodShare {
  method: PaymentMethod;
  orders: number;
  revenue: number;
}

/** Resposta de `GET /analytics/sales`. */
export interface SalesAnalytics {
  range: AnalyticsRange;
  summary: AnalyticsSummary;
  revenueByDay: RevenuePoint[];
  salesByWeekday: WeekdayPoint[];
  topMovies: MovieRanking[];
  topCinemas: CinemaRanking[];
  topProducts: ProductRanking[];
  paymentMethods: PaymentMethodShare[];
}
