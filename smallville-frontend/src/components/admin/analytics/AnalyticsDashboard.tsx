import { AnalyticsPeriod, SalesAnalytics } from "@/src/types/analytics";
import { PAYMENT_METHOD_LABELS } from "@/src/types/payments";
import { weekdayLabel } from "@/src/types/sales-control";
import { formatCents } from "@/src/utils/currency";
import MetricCard from "./MetricCard";
import BarList from "./BarList";
import RevenueTimeline from "./RevenueTimeline";
import SalesByDateTable from "./SalesByDateTable";
import PeriodFilter from "./PeriodFilter";

interface Props {
  period: AnalyticsPeriod;
  analytics?: SalesAnalytics;
  /** Intervalo pedido — usado quando a carga falha e não há resposta. */
  fallbackRange: { from: string; to: string };
  loadError?: string;
}

/** Dashboard de vendas. */
export default function AnalyticsDashboard({
  period,
  analytics,
  fallbackRange,
  loadError,
}: Props) {
  const summary = analytics?.summary;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-black">Vendas / Analytics</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Métricas reais de receita, pedidos, ingressos e bomboniere.
        </p>
      </header>

      <PeriodFilter period={period} range={analytics?.range ?? fallbackRange} />

      {loadError && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {loadError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Receita no período"
          value={formatCents(summary?.revenue ?? 0)}
        />

        <MetricCard
          label="Ingressos vendidos"
          value={String(summary?.ticketsCount ?? 0)}
        />

        <MetricCard label="Pedidos" value={String(summary?.ordersCount ?? 0)} />

        <MetricCard
          label="Ticket médio"
          value={formatCents(summary?.averageOrderValue ?? 0)}
          hint={`${summary?.productsCount ?? 0} produto(s) da bomboniere`}
        />
      </div>

      <RevenueTimeline points={analytics?.revenueByDay ?? []} />

      {/*
        A mesma série do gráfico, em tabela: o gráfico responde "quando
        vendeu", a tabela responde "quanto exatamente". As duas leem
        `revenueByDay`, que é o `timeseries` do backend — não há segunda fonte
        nem número recalculado aqui.
      */}
      <SalesByDateTable
        points={analytics?.revenueByDay ?? []}
        range={analytics?.range ?? fallbackRange}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BarList
          title="Dias que mais vendem"
          description="Receita por dia da semana no período."
          emptyMessage="Sem vendas no período."
          items={(analytics?.salesByWeekday ?? []).map((point) => ({
            label: weekdayLabel(point.weekday),
            value: point.revenue,
            display: formatCents(point.revenue),
            detail: `${point.tickets} ingresso(s) · ${point.orders} pedido(s)`,
          }))}
        />

        <BarList
          title="Filmes mais vendidos"
          description="Ordenado por ingressos vendidos."
          emptyMessage="Nenhum ingresso vendido no período."
          ranked
          items={(analytics?.topMovies ?? []).map((movie) => ({
            label: movie.title,
            value: movie.tickets,
            display: `${movie.tickets} ingresso(s)`,
            detail: [
              formatCents(movie.revenue),
              movie.sessions !== undefined
                ? `${movie.sessions} sessão(ões)`
                : null,
              movie.occupancy !== undefined
                ? `${movie.occupancy}% de ocupação`
                : null,
            ]
              .filter(Boolean)
              .join(" · "),
          }))}
        />

        <BarList
          title="Cinemas com maior venda"
          description="Receita e ingressos por unidade."
          emptyMessage="Nenhuma venda por cinema no período."
          ranked
          items={(analytics?.topCinemas ?? []).map((cinema) => ({
            label: cinema.name,
            value: cinema.revenue,
            display: formatCents(cinema.revenue),
            detail: `${cinema.tickets} ingresso(s)`,
          }))}
        />

        <BarList
          title="Produtos mais vendidos"
          description="Bomboniere, por quantidade."
          emptyMessage="Nenhum produto vendido no período."
          ranked
          items={(analytics?.topProducts ?? []).map((product) => ({
            label: product.name,
            value: product.quantity,
            display: `${product.quantity} un.`,
            detail: formatCents(product.revenue),
          }))}
        />
      </div>

      <BarList
        title="Formas de pagamento"
        description="Somente métodos efetivamente utilizados. Cartão continua desabilitado no checkout."
        emptyMessage="Nenhum pagamento concluído no período."
        items={(analytics?.paymentMethods ?? []).map((item) => ({
          label: PAYMENT_METHOD_LABELS[item.method] ?? item.method,
          value: item.revenue,
          display: formatCents(item.revenue),
          detail: `${item.orders} pedido(s)`,
        }))}
      />
    </div>
  );
}
