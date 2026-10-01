/** "5 min atrás" — o carimbo curto da lista de notificações. */
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function formatRelativeTime(
  isoDate: string,
  now: Date = new Date(),
): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Relógio do servidor adiantado em alguns segundos não vira "em -3 min".
  if (seconds < 60) return "agora";

  if (seconds < HOUR) {
    const minutes = Math.floor(seconds / MINUTE);

    return `${minutes} min atrás`;
  }

  if (seconds < DAY) {
    const hours = Math.floor(seconds / HOUR);

    return `${hours} h atrás`;
  }

  if (seconds < WEEK) {
    const days = Math.floor(seconds / DAY);

    return days === 1 ? "ontem" : `${days} dias atrás`;
  }

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Data e hora completas, para o `title` do item. */
export function formatFullDateTime(isoDate: string): string {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
