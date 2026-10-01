"use client";

import { useState } from "react";
import clsx from "clsx";
import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  AnalyticsPeriod,
  AnalyticsRange,
} from "@/src/types/analytics";
import { useQueryParams } from "@/src/hooks/useQueryParams";
import { isoDayToBr } from "@/src/utils/analytics";
import AdminField, { adminInputClass } from "../AdminField";
import Button from "../../ui/Button";

interface Props {
  period: AnalyticsPeriod;
  /** Intervalo já resolvido pelo servidor — é o que a tela está mostrando. */
  range: AnalyticsRange;
}

/** Filtro de período do dashboard. */
export default function PeriodFilter({ period, range }: Props) {
  const { update, isPending } = useQueryParams();

  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);

  const isCustom = period === ANALYTICS_PERIODS.CUSTOM;

  function selectPreset(next: AnalyticsPeriod) {
    if (next === ANALYTICS_PERIODS.CUSTOM) {
      update({ period: next, from, to });
      return;
    }

    update({ period: next, from: null, to: null });
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <div className="flex flex-wrap items-center gap-2">
        {(Object.values(ANALYTICS_PERIODS) as AnalyticsPeriod[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => selectPreset(value)}
            disabled={isPending}
            aria-pressed={period === value}
            className={clsx(
              "cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
              period === value
                ? "border-red-cinema bg-red-cinema text-white"
                : "border-grayScale-600 bg-deep-black text-grayScale-300 hover:border-red-cinema hover:text-white",
            )}
          >
            {ANALYTICS_PERIOD_LABELS[value]}
          </button>
        ))}
      </div>

      {isCustom && (
        <div className="flex flex-wrap items-end gap-3">
          <AdminField label="De" htmlFor="analytics-from">
            <input
              id="analytics-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Até" htmlFor="analytics-to">
            <input
              id="analytics-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className={adminInputClass}
            />
          </AdminField>

          <Button
            onClick={() =>
              update({ period: ANALYTICS_PERIODS.CUSTOM, from, to })
            }
            disabled={isPending}
            className="mb-0.5"
          >
            Aplicar
          </Button>
        </div>
      )}

      <p className="text-xs text-grayScale-400">
        Exibindo de{" "}
        <span className="font-bold text-grayScale-200">
          {isoDayToBr(range.from)}
        </span>{" "}
        até{" "}
        <span className="font-bold text-grayScale-200">
          {isoDayToBr(range.to)}
        </span>
        . Todas as métricas abaixo respeitam este período.
      </p>
    </div>
  );
}
