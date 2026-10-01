import { RevenuePoint } from "@/src/types/analytics";
import { formatCents, formatCentsCompact } from "@/src/utils/currency";
import { chartMax, formatIsoDayShort, isoDayToBr } from "@/src/utils/analytics";

interface Props {
  points: RevenuePoint[];
}

/** Altura útil das colunas, em pixels. Ver o comentário do componente. */
const TRACK_HEIGHT = 180;

/** Altura mínima de uma barra com receita, para o dia não sumir da leitura. */
const MIN_BAR_HEIGHT = 4;

/** Acima disso os rótulos encostam um no outro e passam a girar. */
const DENSE_SERIES = 14;

/** Largura MÍNIMA de uma coluna, por densidade da série. */
const MIN_COLUMN_WIDTH = { normal: 40, dense: 16 };

/** Espaço entre colunas, em pixels. Precisa casar com as classes `gap-*`. */
const COLUMN_GAP = { normal: 6, dense: 3 };

/** Altura da faixa de rótulos: a girada precisa da diagonal do texto. */
const LABEL_ROW_HEIGHT = { normal: 16, dense: 26 };

/** Receita ao longo do período, em colunas. */
export default function RevenueTimeline({ points }: Props) {
  const max = chartMax(points.map((point) => point.revenue));

  // Séries longas (30 dias, mês inteiro) usam rótulo menor e girado para as
  // datas não se sobreporem.
  const dense = points.length > DENSE_SERIES;
  const tier = dense ? "dense" : "normal";

  // Largura mínima calculada: com `max-content` as barras encolhiam demais.
  const seriesMinWidth =
    points.length * MIN_COLUMN_WIDTH[tier] +
    Math.max(points.length - 1, 0) * COLUMN_GAP[tier];

  return (
    <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <h3 className="text-sm font-black text-grayScale-200">
        Vendas ao longo do tempo
      </h3>

      <p className="mt-1 text-xs text-grayScale-400">
        Receita por dia, no período selecionado.
      </p>

      {points.length === 0 ? (
        <p className="mt-4 rounded-lg border border-grayScale-600 bg-deep-black px-4 py-8 text-center text-xs text-grayScale-400">
          Nenhuma venda registrada neste período.
        </p>
      ) : (
        <div className="mt-5 flex gap-2 sm:gap-3">
          {/*
            Eixo Y: topo é o maior valor da série, e é ele que define 100% da
            altura das barras. Sem venda no período o máximo é zero e o eixo
            mostra zero — não há escala inventada.

            Mais estreito no celular: 80px fixos comiam um quarto da tela, e
            era justamente a largura que faltava para as colunas.
          */}
          <div
            aria-hidden="true"
            className="flex w-14 shrink-0 flex-col justify-between text-right text-[10px] whitespace-nowrap text-grayScale-400 sm:w-20"
            style={{ height: TRACK_HEIGHT }}
          >
            <span>{formatCentsCompact(max)}</span>
            <span>{formatCentsCompact(Math.round(max / 2))}</span>
            <span>{formatCentsCompact(0)}</span>
          </div>

          <div className="custom-scroll min-w-0 flex-1 overflow-x-auto pb-1">
            <div>
              {/* Trilha das colunas: altura fixa e conhecida, com as linhas
                  de grade do eixo Y ao fundo. */}
              <div
                className={`relative flex items-end border-b border-grayScale-600 ${
                  dense ? "gap-[3px]" : "gap-1.5"
                }`}
                style={{ height: TRACK_HEIGHT, minWidth: seriesMinWidth }}
              >
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-0 border-t border-grayScale-600/60"
                />

                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-grayScale-600/60"
                />

                {points.map((point) => {
                  const height =
                    point.revenue > 0 && max > 0
                      ? Math.max(
                          Math.round((point.revenue / max) * TRACK_HEIGHT),
                          MIN_BAR_HEIGHT,
                        )
                      : 0;

                  return (
                    <div
                      key={point.date}
                      className="relative flex min-w-0 flex-1 items-end"
                      title={`${isoDayToBr(point.date)} · ${formatCents(point.revenue)} · ${point.orders} pedido(s) · ${point.tickets} ingresso(s)`}
                    >
                      <div
                        className="w-full rounded-t bg-red-cinema transition-all"
                        style={{ height }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Eixo X: uma coluna por dia, com a MESMA largura das barras,
                  para o rótulo cair embaixo da sua própria coluna. TODAS as
                  datas aparecem; na série densa elas giram em vez de sumir. */}
              <div
                className={`mt-2 flex ${dense ? "gap-[3px]" : "gap-1.5"}`}
                style={{
                  minWidth: seriesMinWidth,
                  height: LABEL_ROW_HEIGHT[tier],
                }}
              >
                {points.map((point) => (
                  <div
                    key={point.date}
                    className="relative min-w-0 flex-1 text-grayScale-400"
                  >
                    <span
                      className={
                        dense
                          ? // Girado em torno do próprio centro e alinhado ao
                            // centro da coluna: a diagonal do texto fica
                            // dentro do container nas duas pontas da série.
                            "absolute top-1 left-1/2 -translate-x-1/2 -rotate-45 text-[9px] leading-none whitespace-nowrap"
                          : "block text-center text-[11px] leading-none whitespace-nowrap"
                      }
                    >
                      {formatIsoDayShort(point.date)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
