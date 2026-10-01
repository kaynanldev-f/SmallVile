/** Resolução do período do dashboard. */

import { ANALYTICS_PERIODS } from "@/src/types/analytics";
import type { AnalyticsPeriod, AnalyticsRange } from "@/src/types/analytics";

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** O mesmo fuso que o backend usa para agrupar as vendas. */
const CINEMA_TIME_ZONE = "America/Sao_Paulo";

/** Hoje no fuso do cinema, como Date local à meia-noite. */
export function cinemaToday(now: Date = new Date()): Date {
  const [year = 0, month = 0, day = 0] = new Intl.DateTimeFormat("en-CA", {
    timeZone: CINEMA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(now)
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

/** Date → "AAAA-MM-DD" (hora local, que é o dia que o administrador vê). */
export function toIsoDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** "AAAA-MM-DD" → Date local à meia-noite. Null quando o formato não bate. */
export function parseIsoDay(value?: string | null): Date | null {
  if (!value || !ISO_DAY.test(value)) return null;

  const [year = 0, month = 0, day = 0] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

/** "AAAA-MM-DD" → "DD/MM", rótulo curto dos eixos. */
export function formatIsoDayShort(value: string): string {
  const date = parseIsoDay(value);

  if (!date) return value;

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}`;
}

/** "AAAA-MM-DD" → "DD/MM/AAAA", o formato de data do sistema. */
export function isoDayToBr(value: string): string {
  const date = parseIsoDay(value);

  if (!date) return value;

  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** "AAAA-MM-DD" → "Segunda-feira", o dia da semana daquela data. */
export function isoDayWeekdayLabel(value: string): string {
  const date = parseIsoDay(value);

  if (!date) return "";

  return WEEKDAY_NAMES[date.getDay()] ?? "";
}

const WEEKDAY_NAMES = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

function shiftDays(date: Date, days: number): Date {
  const next = new Date(date);

  next.setDate(next.getDate() + days);

  return next;
}

/** O preset é válido? Usado para ler o parâmetro da URL sem confiar nele. */
export function parseAnalyticsPeriod(value?: string | null): AnalyticsPeriod {
  const periods = Object.values(ANALYTICS_PERIODS) as string[];

  return periods.includes(value ?? "")
    ? (value as AnalyticsPeriod)
    : ANALYTICS_PERIODS.LAST_30_DAYS;
}

/** Intervalo fechado (inclusivo nas duas pontas) do preset escolhido. */
export function resolveAnalyticsRange(
  period: AnalyticsPeriod,
  from?: string | null,
  to?: string | null,
  today: Date = cinemaToday(),
): AnalyticsRange {
  const reference = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (period === ANALYTICS_PERIODS.CUSTOM) {
    const start = parseIsoDay(from);
    const end = parseIsoDay(to);

    if (start && end) {
      return start <= end
        ? { from: toIsoDay(start), to: toIsoDay(end) }
        : { from: toIsoDay(end), to: toIsoDay(start) };
    }

    if (start) return { from: toIsoDay(start), to: toIsoDay(reference) };
    if (end) return { from: toIsoDay(end), to: toIsoDay(reference) };

    return resolveAnalyticsRange(ANALYTICS_PERIODS.LAST_30_DAYS, null, null, today);
  }

  switch (period) {
    case ANALYTICS_PERIODS.TODAY:
      return { from: toIsoDay(reference), to: toIsoDay(reference) };

    case ANALYTICS_PERIODS.LAST_7_DAYS:
      return { from: toIsoDay(shiftDays(reference, -6)), to: toIsoDay(reference) };

    case ANALYTICS_PERIODS.THIS_MONTH:
      return {
        from: toIsoDay(new Date(reference.getFullYear(), reference.getMonth(), 1)),
        to: toIsoDay(reference),
      };

    case ANALYTICS_PERIODS.LAST_30_DAYS:
    default:
      return { from: toIsoDay(shiftDays(reference, -29)), to: toIsoDay(reference) };
  }
}

/** Maior valor da série, usado como 100% das barras. */
export function chartMax(values: number[]): number {
  return values.reduce((max, value) => (value > max ? value : max), 0);
}

/** Largura da barra em porcentagem, protegida contra divisão por zero. */
export function barWidth(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "0%";

  return `${Math.max((value / max) * 100, 2)}%`;
}
