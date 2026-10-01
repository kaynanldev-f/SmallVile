"use client";

import { CreditCard, Landmark, QrCode } from "lucide-react";
import {
  PAYMENT_METHODS,
  PaymentMethod,
  isPaymentMethodAvailable,
} from "../../types/payments";

interface PaymentMethodsProps {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod) => void;
}

const methods = [
  {
    value: PAYMENT_METHODS.PIX,
    title: "PIX",
    subtitle: "Aprovação instantânea",
    icon: QrCode,
  },
  {
    value: PAYMENT_METHODS.CREDIT_CARD,
    title: "Cartão de Crédito",
    subtitle: "Pague em até 12x",
    icon: CreditCard,
  },
  {
    value: PAYMENT_METHODS.DEBIT_CARD,
    title: "Cartão de Débito",
    subtitle: "Pagamento imediato",
    icon: Landmark,
  },
] satisfies {
  value: PaymentMethod;
  title: string;
  subtitle: string;
  icon: React.ElementType;
}[];

/** Formas de pagamento. */
export default function PaymentMethods({
  value,
  onChange,
}: PaymentMethodsProps) {
  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-6 text-xl font-semibold">Forma de Pagamento</h2>

      <div className="space-y-4">
        {methods.map((method) => {
          const Icon = method.icon;
          const available = isPaymentMethodAvailable(method.value);
          const selected = available && value === method.value;

          return (
            <button
              key={method.value}
              type="button"
              disabled={!available}
              aria-disabled={!available}
              onClick={() => available && onChange(method.value)}
              className={`
                w-full rounded-xl border p-4 transition-all
                flex items-center justify-between
                ${
                  !available
                    ? "cursor-not-allowed border-zinc-800 bg-zinc-900/60 opacity-60"
                    : selected
                      ? "cursor-pointer border-red-500 bg-red-500/10"
                      : "cursor-pointer border-zinc-700 hover:border-red-500"
                }
              `}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`
                    rounded-lg p-3
                    ${
                      selected
                        ? "bg-red-500 text-white"
                        : "bg-zinc-800 text-zinc-300"
                    }
                  `}
                >
                  <Icon size={22} />
                </div>

                <div className="text-left">
                  <h3 className="flex flex-wrap items-center gap-2 font-medium">
                    {method.title}

                    {!available && (
                      <span className="rounded-full border border-yellow-600/40 bg-yellow-500/10 px-2 py-0.5 text-[11px] font-bold text-yellow-300">
                        Em breve
                      </span>
                    )}
                  </h3>

                  <p className="text-sm text-zinc-400">
                    {available
                      ? method.subtitle
                      : "Indisponível no momento — em implementação."}
                  </p>
                </div>
              </div>

              {available && (
                <div
                  className={`
                    h-5 w-5 rounded-full border-2 flex items-center justify-center
                    ${selected ? "border-red-500" : "border-zinc-500"}
                  `}
                >
                  {selected && (
                    <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}
