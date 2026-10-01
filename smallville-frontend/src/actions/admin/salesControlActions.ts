"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { ActionResult } from "@/src/types/admin";
import {
  BackendSessionSalesEnvelope,
  SalesControlSession,
  TicketPricingConfig,
  TicketPricingInput,
  WEEKDAYS,
  Weekday,
  toSessionSalesInfo,
  weekdayLabel,
} from "@/src/types/sales-control";
import { isoToBrDateTime } from "@/src/utils/date";

/** Controle de venda de ingressos — área do administrador. */

const SALES_PATH = "/admin/sales-control";

/* -------------------- Tabela de regras de preço ------------------------- */

/** Regra de preço como o backend a devolve. */
interface RawPriceRule {
  _id: string;
  name: string;
  weekday?: number | null;
  cinema?: string | { _id: string } | null;
  fullPrice: number;
  halfPrice: number;
  active: boolean;
  updatedAt?: string;
}

/** Tabela vazia — usada quando o backend ainda não tem regra cadastrada. */
function emptyPricing(): TicketPricingConfig {
  return {
    defaultPrices: { INTEIRA: 0, MEIA: 0 },
    weekdayRules: WEEKDAYS.map((day) => ({
      weekday: day.value as Weekday,
      enabled: false,
      prices: { INTEIRA: 0, MEIA: 0 },
    })),
  };
}

function ruleCinemaId(rule: RawPriceRule): string | null {
  const cinema = rule.cinema;

  if (!cinema) return null;

  return typeof cinema === "string" ? cinema : cinema._id;
}

/** Só as regras da rede inteira — as que esta tela representa. */
function networkRules(rules: RawPriceRule[]): RawPriceRule[] {
  return rules.filter((rule) => ruleCinemaId(rule) === null);
}

/** Lista de regras → tabela de sete dias. */
function toPricingConfig(rules: RawPriceRule[]): TicketPricingConfig {
  const network = networkRules(rules);
  const base = emptyPricing();

  const fallback = network.find((rule) => rule.weekday == null);

  const defaultPrices = {
    INTEIRA: fallback?.fullPrice ?? base.defaultPrices.INTEIRA,
    MEIA: fallback?.halfPrice ?? base.defaultPrices.MEIA,
  };

  const byWeekday = new Map(
    network
      .filter((rule) => rule.weekday != null)
      .map((rule) => [rule.weekday as number, rule]),
  );

  const updatedAt = network
    .map((rule) => rule.updatedAt)
    .filter((value): value is string => !!value)
    .sort()
    .at(-1);

  return {
    defaultPrices,
    updatedAt,
    weekdayRules: WEEKDAYS.map((day) => {
      const rule = byWeekday.get(day.value);

      return {
        weekday: day.value as Weekday,
        enabled: !!rule?.active,
        prices: {
          INTEIRA: rule?.fullPrice ?? defaultPrices.INTEIRA,
          MEIA: rule?.halfPrice ?? defaultPrices.MEIA,
        },
      };
    }),
  };
}

async function fetchPriceRules(): Promise<ActionResult<RawPriceRule[]>> {
  const result = await apiRequest<RawPriceRule[] | null>(
    "/sales-control/price-rules",
    { fallbackError: "Não foi possível carregar a tabela de preços." },
  );

  if (!result.success) return result;

  return { success: true, data: Array.isArray(result.data) ? result.data : [] };
}

export async function getTicketPricing(): Promise<
  ActionResult<TicketPricingConfig>
> {
  const result = await fetchPriceRules();

  if (!result.success) return result;

  return { success: true, data: toPricingConfig(result.data) };
}

/** Grava a tabela como regras do backend. */
export async function updateTicketPricing(
  input: TicketPricingInput,
): Promise<ActionResult<TicketPricingConfig>> {
  // Preço negativo nem sai daqui; o backend também recusa, mas errar cedo
  // devolve uma mensagem melhor do que o 400 genérico do ValidationPipe.
  const values = [
    input.defaultPrices.INTEIRA,
    input.defaultPrices.MEIA,
    ...input.weekdayRules.flatMap((rule) => [
      rule.prices.INTEIRA,
      rule.prices.MEIA,
    ]),
  ];

  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    return {
      success: false,
      error: "Os preços devem ser valores válidos, iguais ou maiores que zero.",
    };
  }

  /** Padrão da rede: só existe como regra ativa quando tem inteira > 0. */
  const hasDefaultPrice = input.defaultPrices.INTEIRA > 0;

  if (!hasDefaultPrice && input.defaultPrices.MEIA > 0) {
    return {
      success: false,
      error:
        "Informe o preço padrão da inteira antes de definir a meia padrão.",
    };
  }

  const zeroedDay = input.weekdayRules.find(
    (rule) => rule.enabled && rule.prices.INTEIRA <= 0,
  );

  if (zeroedDay) {
    return {
      success: false,
      error: `Informe um preço de inteira maior que zero para ${weekdayLabel(zeroedDay.weekday)} ou desligue o dia para usar o preço padrão.`,
    };
  }

  // O backend recusa meia acima de inteira; avisar aqui evita que o
  // salvamento pare no meio, com parte das regras já gravada.
  const inconsistent = [
    { label: "padrão", prices: input.defaultPrices },
    ...input.weekdayRules
      .filter((rule) => rule.enabled)
      .map((rule) => ({ label: weekdayLabel(rule.weekday), prices: rule.prices })),
  ].find((entry) => entry.prices.MEIA > entry.prices.INTEIRA);

  if (inconsistent) {
    return {
      success: false,
      error: `A meia não pode custar mais que a inteira (${inconsistent.label}).`,
    };
  }

  const current = await fetchPriceRules();

  if (!current.success) return current;

  const network = networkRules(current.data);
  const existingDefault = network.find((rule) => rule.weekday == null);
  const existingByWeekday = new Map(
    network
      .filter((rule) => rule.weekday != null)
      .map((rule) => [rule.weekday as number, rule]),
  );

  /** Cria ou atualiza uma regra, devolvendo a mensagem de erro se falhar. */
  async function persist(
    existing: RawPriceRule | undefined,
    body: {
      name: string;
      weekday: number | null;
      fullPrice: number;
      halfPrice: number;
      active: boolean;
    },
  ): Promise<string | null> {
    // Dia que nunca teve regra e continua desligado não precisa de registro.
    if (!existing && !body.active) return null;

    const unchanged =
      existing &&
      existing.fullPrice === body.fullPrice &&
      existing.halfPrice === body.halfPrice &&
      existing.active === body.active;

    if (unchanged) return null;

    const result = existing
      ? await apiRequest<RawPriceRule>(
          `/sales-control/price-rules/${existing._id}`,
          {
            method: "PATCH",
            body: {
              fullPrice: body.fullPrice,
              halfPrice: body.halfPrice,
              active: body.active,
            },
            fallbackError: "Não foi possível salvar a tabela de preços.",
          },
        )
      : await apiRequest<RawPriceRule>("/sales-control/price-rules", {
          method: "POST",
          body: {
            name: body.name,
            weekday: body.weekday,
            cinemaId: null,
            fullPrice: body.fullPrice,
            halfPrice: body.halfPrice,
            active: body.active,
          },
          fallbackError: "Não foi possível salvar a tabela de preços.",
        });

    return result.success ? null : result.error;
  }

  const failure = await persist(existingDefault, {
    name: "Padrão da rede",
    weekday: null,
    fullPrice: input.defaultPrices.INTEIRA,
    halfPrice: input.defaultPrices.MEIA,
    // Sem preço padrão informado a regra não vale — e uma regra ativa em zero
    // zeraria o ingresso de toda a rede.
    active: hasDefaultPrice,
  });

  if (failure) return { success: false, error: failure };

  // Sequencial de propósito: o índice único do backend é `{ weekday, cinema }`.
  for (const rule of input.weekdayRules) {
    const error = await persist(existingByWeekday.get(rule.weekday), {
      name: weekdayLabel(rule.weekday),
      weekday: rule.weekday,
      fullPrice: rule.prices.INTEIRA,
      halfPrice: rule.prices.MEIA,
      active: rule.enabled,
    });

    if (error) return { success: false, error };
  }

  revalidatePath(SALES_PATH);

  const refreshed = await fetchPriceRules();

  return {
    success: true,
    data: refreshed.success
      ? toPricingConfig(refreshed.data)
      : toPricingConfig([]),
  };
}

/* ==========================================================================
   SESSÕES
   ========================================================================== */

/** Sessão como `GET /sales-control/sessions` a devolve. */
interface RawControlSession extends BackendSessionSalesEnvelope {
  _id: string;
  movieTitle: string;
  cinemaId: string | { _id: string; name?: string; city?: string };
  roomName: string;
  roomType: string;
  language: string;
  dateTime: string;
  price: number;
}

/** Sessões com o estado de venda, para a tela de controle. */
export async function listSalesControlSessions(): Promise<
  ActionResult<SalesControlSession[]>
> {
  const result = await apiRequest<RawControlSession[] | null>(
    "/sales-control/sessions",
    { fallbackError: "Não foi possível carregar as sessões." },
  );

  if (!result.success) return result;

  const sessions = Array.isArray(result.data) ? result.data : [];

  const items: SalesControlSession[] = sessions.map((session) => {
    const cinema = session.cinemaId;
    const cinemaId = typeof cinema === "string" ? cinema : cinema?._id;
    const cinemaName = typeof cinema === "string" ? undefined : cinema?.name;

    return {
      id: session._id,
      movieTitle: session.movieTitle,
      cinemaId: String(cinemaId ?? ""),
      cinemaName,
      roomName: session.roomName,
      roomType: session.roomType,
      language: session.language,
      dateTime: session.dateTime,
      price: session.price,

      ...toSessionSalesInfo(session, isoToBrDateTime),
    };
  });

  return { success: true, data: items };
}

/** Liga/desliga a venda e define a janela de uma sessão. */
export async function updateSessionSales(
  sessionId: string,
  input: { salesEnabled: boolean; salesStartAt: string | null; salesEndAt: string | null },
): Promise<ActionResult<null>> {
  const result = await apiRequest<unknown>(
    `/sales-control/sessions/${sessionId}`,
    {
      method: "PATCH",
      body: {
        salesEnabled: input.salesEnabled,
        salesStartAt: input.salesStartAt,
        salesEndAt: input.salesEndAt,
      },
      fallbackError: "Não foi possível atualizar a venda desta sessão.",
    },
  );

  if (!result.success) return result;

  revalidatePath(SALES_PATH);
  revalidatePath("/admin/sessions");

  return { success: true, data: null };
}
