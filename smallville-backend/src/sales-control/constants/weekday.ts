/** Dia da semana no fuso do cinema (America/Sao_Paulo). */
export const CINEMA_TIME_ZONE = 'America/Sao_Paulo';

/**
 * O Brasil não tem mais horário de verão desde 2019, então o deslocamento do
 * fuso do cinema é fixo.
 */
export const CINEMA_UTC_OFFSET = '-03:00';

export const WEEKDAY_LABEL: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** "DD/MM/AAAA" com hora opcional — o formato em que `Session.dateTime` é gravado. */
const BR_DATE_TIME = /^(\d{2})\/(\d{2})\/(\d{4})(?:[\sT](\d{2}):(\d{2}))?$/;

/** Instante real a partir do que está gravado na sessão. */
export const parseCinemaDate = (value: string | Date): Date | null => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== 'string') {
    return null;
  }

  const raw = value.trim();
  const brazilian = BR_DATE_TIME.exec(raw);

  if (brazilian) {
    const [, day, month, year, hour = '00', minute = '00'] = brazilian;

    const date = new Date(
      `${year}-${month}-${day}T${hour}:${minute}:00${CINEMA_UTC_OFFSET}`,
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  // Datas já em ISO 8601 (sessões gravadas por outra origem) continuam
  // funcionando pelo caminho normal.
  const parsed = new Date(raw);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const getCinemaWeekday = (value: string | Date): number | null => {
  const date = parseCinemaDate(value);

  if (!date) {
    return null;
  }

  const short = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    timeZone: CINEMA_TIME_ZONE,
  }).format(date);

  return WEEKDAY_INDEX[short] ?? null;
};
