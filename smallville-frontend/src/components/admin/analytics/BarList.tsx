import { barWidth, chartMax } from "@/src/utils/analytics";

export interface BarItem {
  /** Rótulo da linha. */
  label: string;
  /** Valor que define o comprimento da barra. */
  value: number;
  /** Texto mostrado à direita (já formatado). */
  display: string;
  /** Linha secundária, opcional. */
  detail?: string;
}

interface Props {
  title: string;
  description?: string;
  items: BarItem[];
  emptyMessage: string;
  /** Numera as linhas (1., 2., 3.) — usado nos rankings. */
  ranked?: boolean;
}

/** Gráfico de barras horizontais. */
export default function BarList({
  title,
  description,
  items,
  emptyMessage,
  ranked,
}: Props) {
  const max = chartMax(items.map((item) => item.value));

  return (
    <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <h3 className="text-sm font-black text-grayScale-200">{title}</h3>

      {description && (
        <p className="mt-1 text-xs text-grayScale-400">{description}</p>
      )}

      {items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-grayScale-600 bg-deep-black px-4 py-6 text-center text-xs text-grayScale-400">
          {emptyMessage}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-xs font-bold text-grayScale-200">
                  {ranked && (
                    <span className="text-grayScale-400">{index + 1}. </span>
                  )}
                  {item.label}
                </span>

                <span className="shrink-0 text-xs font-black text-grayScale-200">
                  {item.display}
                </span>
              </div>

              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-grayScale-600">
                <div
                  className="h-full rounded-full bg-red-cinema"
                  style={{ width: barWidth(item.value, max) }}
                />
              </div>

              {item.detail && (
                <p className="mt-1 text-[11px] text-grayScale-400">
                  {item.detail}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
