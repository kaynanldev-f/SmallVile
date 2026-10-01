import {
  ORDER_AUDIT_OPERATION_LABELS,
  ORDER_AUDIT_RESULT_LABELS,
  ORDER_AUDIT_RESULT_TONES,
  RefundAuditEntry,
} from "@/src/types/refund";
import { formatFullDateTime } from "@/src/utils/relative-time";

/** Histórico de auditoria do pedido, como vem de `GET /refunds/:id`. */
export default function RefundAuditTrail({
  history,
}: {
  history: RefundAuditEntry[];
}) {
  return (
    <section className="rounded-xl border border-grayScale-600 bg-gray-surface p-5">
      <h3 className="text-sm font-black text-grayScale-200">
        Histórico do pedido
      </h3>

      <p className="mt-1 text-xs text-grayScale-400">
        Auditoria registrada pelo backend: operação, quem executou e o
        resultado.
      </p>

      {history.length === 0 ? (
        <p className="mt-4 rounded-lg border border-grayScale-600 bg-deep-black px-4 py-6 text-center text-xs text-grayScale-400">
          Nenhum registro de auditoria para este pedido.
        </p>
      ) : (
        <ol className="mt-4 flex flex-col gap-3">
          {history.map((entry) => (
            <li
              key={entry.id}
              className="flex flex-col gap-1 border-l-2 border-grayScale-600 pl-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-grayScale-200">
                  {ORDER_AUDIT_OPERATION_LABELS[entry.operation] ??
                    entry.operation}
                </span>

                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                    ORDER_AUDIT_RESULT_TONES[entry.result] ??
                    "border-grayScale-600 bg-grayScale-700 text-grayScale-400"
                  }`}
                >
                  {ORDER_AUDIT_RESULT_LABELS[entry.result] ?? entry.result}
                </span>
              </div>

              <p className="text-[11px] text-grayScale-400">
                {entry.actor?.name ?? "Usuário removido"}

                {entry.actor?.role && (
                  <span className="ml-1 text-grayScale-500">
                    ({entry.actor.role})
                  </span>
                )}

                {entry.createdAt && (
                  <span className="ml-2 text-grayScale-500">
                    {formatFullDateTime(entry.createdAt)}
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
