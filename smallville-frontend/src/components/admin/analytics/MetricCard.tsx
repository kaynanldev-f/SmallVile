interface Props {
  label: string;
  value: string;
  hint?: string;
}

/** Card de indicador do topo do dashboard. */
export default function MetricCard({ label, value, hint }: Props) {
  return (
    <div className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <p className="text-[11px] font-bold tracking-wide text-grayScale-400 uppercase">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-grayScale-200">{value}</p>

      {hint && <p className="mt-1 text-xs text-grayScale-400">{hint}</p>}
    </div>
  );
}
