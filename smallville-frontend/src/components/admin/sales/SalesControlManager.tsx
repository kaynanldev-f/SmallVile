"use client";

import { useState } from "react";
import {
  SalesControlSession,
  TicketPricingConfig,
} from "@/src/types/sales-control";
import TicketPricingForm from "./TicketPricingForm";
import SessionSalesTable from "./SessionSalesTable";

interface Props {
  pricing: TicketPricingConfig;
  sessions: SalesControlSession[];
  loadError?: string;
}

/** Controle de Vendas — preços e disponibilidade num lugar só. */
export default function SalesControlManager({
  pricing,
  sessions,
  loadError,
}: Props) {
  const [error, setError] = useState<string | null>(loadError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  function report(message: string) {
    setError(null);
    setSuccess(message);
  }

  function fail(message: string) {
    setSuccess(null);
    setError(message);
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-black">Controle de Vendas</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Preço de inteira e meia, regras por dia da semana, disponibilidade e
          período de venda de cada sessão.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          onClick={() => setError(null)}
          className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          onClick={() => setSuccess(null)}
          className="cursor-pointer rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400"
        >
          {success}
        </p>
      )}

      <TicketPricingForm
        pricing={pricing}
        onSaved={report}
        onError={fail}
      />

      <SessionSalesTable
        sessions={sessions}
        onSaved={report}
        onError={fail}
      />
    </div>
  );
}
