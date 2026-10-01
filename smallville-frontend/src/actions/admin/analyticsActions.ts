"use server";

import { apiRequest } from "@/src/lib/api";
import { ActionResult } from "@/src/types/admin";
import {
  AnalyticsRange,
  CinemaRanking,
  MovieRanking,
  PaymentMethodShare,
  ProductRanking,
  RevenuePoint,
  SalesAnalytics,
  WeekdayPoint,
} from "@/src/types/analytics";
import type { PaymentMethod } from "@/src/types/payments";

/** Métricas de venda — área do administrador. */

/** Fuso do cinema, fixo como no backend. */
const CINEMA_UTC_OFFSET = "-03:00";

/** "AAAA-MM-DD" → início do dia no fuso do cinema. */
function startOfCinemaDay(isoDay: string): string {
  return `${isoDay}T00:00:00.000${CINEMA_UTC_OFFSET}`;
}

/** "AAAA-MM-DD" → último instante do dia no fuso do cinema. */
function endOfCinemaDay(isoDay: string): string {
  return `${isoDay}T23:59:59.999${CINEMA_UTC_OFFSET}`;
}

function rangeParams(range: AnalyticsRange): URLSearchParams {
  return new URLSearchParams({
    period: "personalizado",
    from: startOfCinemaDay(range.from),
    to: endOfCinemaDay(range.to),
  });
}

/* ---------------- Formato bruto devolvido pelo backend ------------------ */

interface RawSalesResponse {
  period?: { from?: string; to?: string };
  summary?: {
    revenue?: number;
    orders?: number;
    tickets?: number;
    products?: number;
    averageOrderValue?: number;
  };
  timeseries?: {
    date: string;
    revenue?: number;
    orders?: number;
    tickets?: number;
  }[];
  weekdays?: {
    weekday: number;
    revenue?: number;
    orders?: number;
    tickets?: number;
  }[];
  paymentMethods?: {
    method: PaymentMethod;
    /** Receita do método, em centavos. A tela chama isso de `revenue`. */
    amount?: number;
    /** Pagamentos aprovados. A tela chama isso de `orders`. */
    count?: number;
  }[];
}

interface RawRanking<T> {
  items?: T[];
}

interface RawMovie {
  movieId?: string | null;
  title?: string;
  tickets?: number;
  revenue?: number;
  sessions?: number;
  /** Porcentagem com uma casa; `null` quando não há capacidade conhecida. */
  occupancyRate?: number | null;
}

interface RawCinema {
  cinemaId?: string | null;
  name?: string;
  tickets?: number;
  revenue?: number;
}

interface RawProduct {
  productId?: string | null;
  name?: string;
  quantity?: number;
  revenue?: number;
}

function toArray<T>(value: T[] | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

/** Métricas do período. */
export async function getSalesAnalytics(
  range: AnalyticsRange,
): Promise<ActionResult<SalesAnalytics>> {
  const params = rangeParams(range);

  const [sales, movies, cinemas, products] = await Promise.all([
    apiRequest<RawSalesResponse>(`/analytics/sales?${params}`, {
      fallbackError: "Não foi possível carregar as métricas de vendas.",
    }),
    apiRequest<RawRanking<RawMovie>>(`/analytics/movies?${params}`, {
      fallbackError: "Não foi possível carregar o ranking de filmes.",
    }),
    apiRequest<RawRanking<RawCinema>>(`/analytics/cinemas?${params}`, {
      fallbackError: "Não foi possível carregar o ranking de cinemas.",
    }),
    apiRequest<RawRanking<RawProduct>>(`/analytics/products?${params}`, {
      fallbackError: "Não foi possível carregar o ranking de produtos.",
    }),
  ]);

  if (!sales.success) return sales;

  const raw = sales.data ?? {};

  const revenueByDay: RevenuePoint[] = toArray(raw.timeseries).map((point) => ({
    date: point.date,
    revenue: point.revenue ?? 0,
    orders: point.orders ?? 0,
    tickets: point.tickets ?? 0,
  }));

  const salesByWeekday: WeekdayPoint[] = toArray(raw.weekdays).map((point) => ({
    weekday: point.weekday,
    revenue: point.revenue ?? 0,
    orders: point.orders ?? 0,
    tickets: point.tickets ?? 0,
  }));

  const topMovies: MovieRanking[] = toArray(
    movies.success ? movies.data?.items : [],
  ).map((movie) => ({
    movieId: movie.movieId ?? undefined,
    title: movie.title ?? "Filme removido",
    tickets: movie.tickets ?? 0,
    revenue: movie.revenue ?? 0,
    sessions: movie.sessions,
    // O backend devolve `occupancyRate`, e `null` quando não há capacidade
    // conhecida — nesse caso a tela simplesmente não mostra a ocupação.
    occupancy: movie.occupancyRate ?? undefined,
  }));

  const topCinemas: CinemaRanking[] = toArray(
    cinemas.success ? cinemas.data?.items : [],
  ).map((cinema) => ({
    cinemaId: cinema.cinemaId ?? undefined,
    name: cinema.name ?? "Cinema removido",
    tickets: cinema.tickets ?? 0,
    revenue: cinema.revenue ?? 0,
  }));

  const topProducts: ProductRanking[] = toArray(
    products.success ? products.data?.items : [],
  ).map((product) => ({
    productId: product.productId ?? undefined,
    name: product.name ?? "Produto removido",
    quantity: product.quantity ?? 0,
    revenue: product.revenue ?? 0,
  }));

  /** Só métodos com venda real aparecem. */
  const paymentMethods: PaymentMethodShare[] = toArray(raw.paymentMethods)
    .map((item) => ({
      method: item.method,
      revenue: item.amount ?? 0,
      orders: item.count ?? 0,
    }))
    .filter((item) => item.orders > 0 || item.revenue > 0);

  return {
    success: true,
    data: {
      range,

      summary: {
        revenue: raw.summary?.revenue ?? 0,
        ordersCount: raw.summary?.orders ?? 0,
        ticketsCount: raw.summary?.tickets ?? 0,
        productsCount: raw.summary?.products ?? 0,
        averageOrderValue: raw.summary?.averageOrderValue ?? 0,
      },

      revenueByDay,
      salesByWeekday,
      topMovies,
      topCinemas,
      topProducts,
      paymentMethods,
    },
  };
}
