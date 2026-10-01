"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateTicketPricing } from "@/src/actions/admin/salesControlActions";
import {
  TicketPricingConfig,
  WEEKDAYS,
  Weekday,
  WeekdayPriceRule,
  weekdayLabel,
} from "@/src/types/sales-control";
import { TicketType } from "@/src/types/ticket";
import { centsToInput, formatCents, inputToCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS } from "@/src/utils/ticket";
import AdminField, { adminInputClass } from "../AdminField";
import Button from "../../ui/Button";

/** Preços do formulário ficam como texto em reais, como o admin digita. */
type PriceDraft = Record<TicketType, string>;

interface RuleDraft {
  weekday: Weekday;
  enabled: boolean;
  prices: PriceDraft;
}

interface Props {
  pricing: TicketPricingConfig;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

function toDraft(prices: Record<TicketType, number>): PriceDraft {
  return {
    INTEIRA: centsToInput(prices.INTEIRA),
    MEIA: centsToInput(prices.MEIA),
  };
}

/** Tabela de preços de ingresso. */
export default function TicketPricingForm({ pricing, onSaved, onError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [defaults, setDefaults] = useState<PriceDraft>(
    toDraft(pricing.defaultPrices),
  );

  const [rules, setRules] = useState<RuleDraft[]>(
    pricing.weekdayRules.map((rule) => ({
      weekday: rule.weekday,
      enabled: rule.enabled,
      prices: toDraft(rule.prices),
    })),
  );

  function setRule(weekday: Weekday, changes: Partial<RuleDraft>) {
    setRules((current) =>
      current.map((rule) =>
        rule.weekday === weekday ? { ...rule, ...changes } : rule,
      ),
    );
  }

  function setRulePrice(weekday: Weekday, type: TicketType, value: string) {
    setRules((current) =>
      current.map((rule) =>
        rule.weekday === weekday
          ? { ...rule, prices: { ...rule.prices, [type]: value } }
          : rule,
      ),
    );
  }

  function save() {
    const defaultInteira = inputToCents(defaults.INTEIRA);
    const defaultMeia = inputToCents(defaults.MEIA);

    if (defaultInteira === null || defaultMeia === null) {
      onError("Informe os preços padrão de inteira e meia.");
      return;
    }

    // Padrão zerado é uma escolha válida ("cada sessão usa o próprio preço"),
    // mas meia sem inteira não é: a regra iria para o backend com a inteira em
    // zero e zeraria o ingresso.
    if (defaultInteira === 0 && defaultMeia > 0) {
      onError("Informe o preço padrão da inteira antes de definir a meia.");
      return;
    }

    const parsedRules: WeekdayPriceRule[] = [];

    for (const rule of rules) {
      // Dia desligado não precisa de valor válido: ele usa o padrão. Ainda
      // assim guardamos o que estiver digitado para não perder o rascunho.
      const inteira = inputToCents(rule.prices.INTEIRA);
      const meia = inputToCents(rule.prices.MEIA);

      if (rule.enabled && (inteira === null || meia === null)) {
        onError(
          `Informe os preços de inteira e meia para ${weekdayLabel(rule.weekday)}.`,
        );
        return;
      }

      if (rule.enabled && inteira === 0) {
        onError(
          `O preço de inteira de ${weekdayLabel(rule.weekday)} precisa ser maior que zero. Desligue o dia para usar o preço padrão.`,
        );
        return;
      }

      parsedRules.push({
        weekday: rule.weekday,
        enabled: rule.enabled,
        prices: {
          INTEIRA: inteira ?? defaultInteira,
          MEIA: meia ?? defaultMeia,
        },
      });
    }

    startTransition(async () => {
      const result = await updateTicketPricing({
        defaultPrices: { INTEIRA: defaultInteira, MEIA: defaultMeia },
        weekdayRules: parsedRules,
      });

      if (!result.success) {
        onError(result.error);
        return;
      }

      onSaved("Tabela de preços atualizada.");
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-6">
      <h3 className="text-lg font-black">Preços dos ingressos</h3>

      <p className="mt-1 text-xs text-grayScale-400">
        Valores aplicados pelo backend no momento da compra. O preço do dia da
        semana, quando ativo, tem prioridade sobre o padrão. Deixe o padrão em
        0,00 para que cada sessão continue valendo pelo preço cadastrado nela.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {(Object.keys(defaults) as TicketType[]).map((type) => (
          <AdminField
            key={type}
            label={`${TICKET_TYPE_LABELS[type]} (padrão)`}
            htmlFor={`default-${type}`}
            hint="Em reais, ex.: 30,00"
          >
            <input
              id={`default-${type}`}
              inputMode="decimal"
              value={defaults[type]}
              onChange={(event) =>
                setDefaults({ ...defaults, [type]: event.target.value })
              }
              className={adminInputClass}
            />
          </AdminField>
        ))}
      </div>

      <h4 className="mt-8 text-sm font-black">Preço por dia da semana</h4>

      <p className="mt-1 text-xs text-grayScale-400">
        Ative apenas os dias com preço diferente. Os demais seguem o padrão.
      </p>

      <div className="mt-4 overflow-x-auto rounded-lg border border-grayScale-600">
        <table className="w-full min-w-2xl text-left text-sm">
          <thead className="border-b border-grayScale-600 text-xs text-grayScale-400 uppercase">
            <tr>
              <th className="px-4 py-3 font-bold">Dia</th>
              <th className="px-4 py-3 font-bold">Preço próprio</th>
              <th className="px-4 py-3 font-bold">Inteira</th>
              <th className="px-4 py-3 font-bold">Meia</th>
            </tr>
          </thead>

          <tbody>
            {rules.map((rule) => {
              const day = WEEKDAYS.find((item) => item.value === rule.weekday);

              return (
                <tr
                  key={rule.weekday}
                  className="border-b border-grayScale-600/50 last:border-0"
                >
                  <td className="px-4 py-3 font-bold text-white">
                    {day?.label ?? rule.weekday}
                  </td>

                  <td className="px-4 py-3">
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-grayScale-400">
                      <input
                        type="checkbox"
                        checked={rule.enabled}
                        onChange={(event) =>
                          setRule(rule.weekday, {
                            enabled: event.target.checked,
                          })
                        }
                        className="h-4 w-4 accent-[#e50914]"
                      />
                      {rule.enabled ? "Ativo" : "Usa o padrão"}
                    </label>
                  </td>

                  {(["INTEIRA", "MEIA"] as TicketType[]).map((type) => (
                    <td key={type} className="px-4 py-3">
                      <input
                        inputMode="decimal"
                        disabled={!rule.enabled}
                        value={rule.prices[type]}
                        aria-label={`${TICKET_TYPE_LABELS[type]} de ${day?.label ?? ""}`}
                        onChange={(event) =>
                          setRulePrice(rule.weekday, type, event.target.value)
                        }
                        className={`${adminInputClass} w-28 py-1 disabled:opacity-40`}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-grayScale-400">
          Padrão atual: inteira{" "}
          <span className="font-bold text-grayScale-200">
            {formatCents(pricing.defaultPrices.INTEIRA)}
          </span>{" "}
          · meia{" "}
          <span className="font-bold text-grayScale-200">
            {formatCents(pricing.defaultPrices.MEIA)}
          </span>
        </p>

        <Button onClick={save} disabled={isPending}>
          {isPending ? "Salvando..." : "Salvar preços"}
        </Button>
      </div>
    </section>
  );
}
