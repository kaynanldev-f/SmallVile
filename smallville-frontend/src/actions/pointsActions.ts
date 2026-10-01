"use server";

import { apiRequest } from "@/src/lib/api";
import { ActionResult } from "@/src/types/admin";
import {
  PointsBalance,
  PointsTransaction,
  PointsTransactionType,
  PointsTransactionsPage,
  POINTS_RULE,
} from "@/src/types/points";

/** Programa de pontos do usuário logado. */

/** Regra de pontuação como o backend a devolve (`getEarningRule`). */
interface RawEarningRule {
  pointsPerStep?: number;
  stepAmountInCents?: number;
  description?: string;
}

interface RawBalance {
  balance?: number;
  totalEarned?: number;
  totalRedeemed?: number;
  rule?: RawEarningRule;
  lastEarnedAt?: string;
}

interface RawTransaction {
  _id: string;
  type: PointsTransactionType;
  points: number;
  balanceAfter?: number;
  description?: string;
  /** O campo do schema chama-se `order` e vem populado ou como id cru. */
  order?: string | { _id: string };
  amountInCents?: number;
  createdAt: string;
}

interface RawTransactionsPage {
  items?: RawTransaction[];
  total?: number;
  page?: number;
  limit?: number;
}

export async function getMyPointsBalance(): Promise<
  ActionResult<PointsBalance>
> {
  const result = await apiRequest<RawBalance>("/loyalty/me", {
    fallbackError: "Não foi possível carregar seus pontos.",
  });

  if (!result.success) return result;

  const raw = result.data ?? {};

  return {
    success: true,
    data: {
      balance: raw.balance ?? 0,
      totalEarned: raw.totalEarned ?? 0,
      totalRedeemed: raw.totalRedeemed ?? 0,
      /** O backend nomeia a regra como `pointsPerStep` / `stepAmountInCents`. */
      rule: {
        amountInCents:
          raw.rule?.stepAmountInCents ?? POINTS_RULE.amountInCents,
        points: raw.rule?.pointsPerStep ?? POINTS_RULE.points,
      },
      lastEarnedAt: raw.lastEarnedAt,
    },
  };
}

export async function getMyPointsTransactions(
  page = 1,
  limit = 10,
): Promise<ActionResult<PointsTransactionsPage>> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const result = await apiRequest<RawTransaction[] | RawTransactionsPage>(
    `/loyalty/me/transactions?${params}`,
    { fallbackError: "Não foi possível carregar seu extrato de pontos." },
  );

  if (!result.success) return result;

  const raw = Array.isArray(result.data) ? undefined : result.data;
  const source = Array.isArray(result.data) ? result.data : raw?.items;
  const rawItems = Array.isArray(source) ? source : [];

  const items: PointsTransaction[] = rawItems.map((item) => ({
    id: item._id,
    type: item.type,
    points: item.points,
    balanceAfter: item.balanceAfter ?? 0,
    description: item.description ?? "Lançamento de pontos",
    orderId:
      typeof item.order === "object" && item.order !== null
        ? item.order._id
        : item.order,
    amountInCents: item.amountInCents,
    createdAt: item.createdAt,
  }));

  return {
    success: true,
    data: {
      items,
      total: raw?.total ?? items.length,
      page: raw?.page ?? page,
      limit: raw?.limit ?? limit,
    },
  };
}
