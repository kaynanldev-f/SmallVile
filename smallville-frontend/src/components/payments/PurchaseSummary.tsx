import { PurchaseSummary as Summary } from "../../types/payments";
import { formatCents } from "@/src/utils/currency";

interface Props {
  purchase: Summary;
}

export default function ContPurchaseSummary({ purchase }: Props) {
  const formatCurrency = formatCents;

  return (
    <aside className="rounded-xl bg-zinc-900 border border-zinc-800 p-6">
      <h2 className="text-lg font-semibold mb-6">Resumo da Compra</h2>

      <div className="space-y-2 text-sm">
        <p>
          <span className="text-zinc-400">Filme:</span> {purchase.movie}
        </p>

        <p>
          <span className="text-zinc-400">Sessão:</span> {purchase.session}
        </p>

        <p>
          <span className="text-zinc-400">Sala:</span> {purchase.room}
        </p>

        <p>
          <span className="text-zinc-400">Assentos:</span>{" "}
          {purchase.seats?.join(", ") ?? "Nenhum assento"}
        </p>
      </div>

      <hr className="my-6 border-zinc-800" />

      <div>
        <h3 className="text-sm font-semibold mb-3">Ingressos</h3>

        {purchase.tickets?.map((ticket, index) => (
          <div
            key={ticket.id ?? ticket.seatNumber ?? index}
            className="flex justify-between mb-2"
          >
            <span>
              {ticket.description ?? `${ticket.type} - ${ticket.seatNumber}`}
            </span>

            <span>{formatCurrency(ticket.price ?? 0)}</span>
          </div>
        ))}
      </div>

      {!!purchase.products?.length && (
        <>
          <hr className="my-6 border-zinc-800" />

          <div>
            <h3 className="text-sm font-semibold mb-3">Bomboniere</h3>

            {purchase.products.map((product) => (
              <div key={product.id} className="flex justify-between mb-2">
                <span>{product.name}</span>

                <span>{formatCurrency(product.price ?? 0)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <hr className="my-6 border-zinc-800" />

      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Descontos</span>

          <span className="text-green-500">
            - {formatCurrency(purchase.discount ?? 0)}
          </span>
        </div>

        <div className="flex justify-between text-lg font-bold text-red-500">
          <span>Total</span>

          <span>{formatCurrency(purchase.total ?? 0)}</span>
        </div>
      </div>
    </aside>
  );
}
