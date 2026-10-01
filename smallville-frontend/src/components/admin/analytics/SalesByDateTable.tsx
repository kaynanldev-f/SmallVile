import { AnalyticsRange, RevenuePoint } from "@/src/types/analytics";
import { formatCents } from "@/src/utils/currency";
import { isoDayToBr, isoDayWeekdayLabel } from "@/src/utils/analytics";

interface Props {
  points: RevenuePoint[];
  range: AnalyticsRange;
}

/** Comparação das vendas por data. */
export default function SalesByDateTable({ points, range }: Props) {
  // Mais recente primeiro: "AAAA-MM-DD" ordena como texto na mesma ordem que
  // como data, então não é preciso construir `Date` para comparar.
  const rows = [...points].sort((a, b) => b.date.localeCompare(a.date));

  const totals = rows.reduce(
    (sum, row) => ({
      revenue: sum.revenue + row.revenue,
      orders: sum.orders + row.orders,
      tickets: sum.tickets + row.tickets,
    }),
    { revenue: 0, orders: 0, tickets: 0 },
  );

  const bestRevenue = rows.reduce((max, row) => Math.max(max, row.revenue), 0);

  return (
    <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-black text-grayScale-200">
          Comparação por data
        </h3>

        <span className="text-[11px] text-grayScale-400">
          {isoDayToBr(range.from)} a {isoDayToBr(range.to)}
        </span>
      </div>

      <p className="mt-1 text-xs text-grayScale-400">
        Pedidos, ingressos e receita de cada dia com venda aprovada no período.
      </p>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-grayScale-600 bg-deep-black px-4 py-6 text-center text-xs text-grayScale-400">
          Nenhuma venda aprovada entre {isoDayToBr(range.from)} e{" "}
          {isoDayToBr(range.to)}.
        </p>
      ) : (
        <div className="custom-scroll mt-4 overflow-x-auto rounded-lg border border-grayScale-600">
          <table className="w-full min-w-xl text-left text-sm">
            <caption className="sr-only">
              Vendas por data entre {isoDayToBr(range.from)} e{" "}
              {isoDayToBr(range.to)}
            </caption>

            <thead className="border-b border-grayScale-600 text-[11px] text-grayScale-400 uppercase">
              <tr>
                <th scope="col" className="px-4 py-3 font-bold">
                  Data
                </th>

                <th scope="col" className="px-4 py-3 text-right font-bold">
                  Pedidos
                </th>

                <th scope="col" className="px-4 py-3 text-right font-bold">
                  Ingressos
                </th>

                <th scope="col" className="px-4 py-3 text-right font-bold">
                  Receita
                </th>

                <th scope="col" className="px-4 py-3 text-right font-bold">
                  Participação
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const share =
                  totals.revenue > 0
                    ? Math.round((row.revenue / totals.revenue) * 100)
                    : 0;

                return (
                  <tr
                    key={row.date}
                    className="border-b border-grayScale-600/50 last:border-0"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 text-left font-bold whitespace-nowrap text-white"
                    >
                      {isoDayToBr(row.date)}

                      <span className="block text-[11px] font-normal text-grayScale-400">
                        {isoDayWeekdayLabel(row.date)}
                      </span>
                    </th>

                    <td className="px-4 py-3 text-right text-grayScale-200">
                      {row.orders}
                    </td>

                    <td className="px-4 py-3 text-right text-grayScale-200">
                      {row.tickets}
                    </td>

                    <td
                      className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                        row.revenue === bestRevenue && bestRevenue > 0
                          ? "text-red-cinema"
                          : "text-grayScale-200"
                      }`}
                    >
                      {formatCents(row.revenue)}
                    </td>

                    <td className="px-4 py-3 text-right text-grayScale-400">
                      {share}%
                    </td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot className="border-t border-grayScale-600 text-xs">
              <tr>
                <th scope="row" className="px-4 py-3 text-left font-black">
                  Total do período
                </th>

                <td className="px-4 py-3 text-right font-bold text-grayScale-200">
                  {totals.orders}
                </td>

                <td className="px-4 py-3 text-right font-bold text-grayScale-200">
                  {totals.tickets}
                </td>

                <td className="px-4 py-3 text-right font-black whitespace-nowrap text-white">
                  {formatCents(totals.revenue)}
                </td>

                <td className="px-4 py-3 text-right text-grayScale-400">
                  {rows.length} dia(s)
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
