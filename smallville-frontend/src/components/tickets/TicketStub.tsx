import MoviePoster from "@/src/components/ui/MoviePoster";
import { Ticket, TicketStatus } from "@/src/types/ticket";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS } from "@/src/utils/ticket";

interface TicketStubProps {
  ticket: Ticket;
  /** Nome de quem comprou, quando o contexto não é "meus ingressos". */
  holderLabel?: string;
}

/** Rótulo e cor de cada status vindo do backend. */
const STATUS_META: Record<TicketStatus, { label: string; className: string }> = {
  valido: {
    label: "Válido",
    className: "border-green-500/40 bg-green-500/10 text-green-300",
  },
  utilizado: {
    label: "Utilizado",
    className: "border-grayScale-600 bg-grayScale-700 text-grayScale-400",
  },
  cancelado: {
    label: "Cancelado",
    className: "border-red-500/40 bg-red-500/10 text-red-300",
  },
};

/** O ingresso em si. */
export default function TicketStub({ ticket, holderLabel }: TicketStubProps) {
  const [date, time] = ticket.sessionDateTime?.split(" ") ?? [];
  const holder = holderLabel ?? ticket.holderName;
  const status = STATUS_META[ticket.status] ?? STATUS_META.valido;

  return (
    <article className="flex w-full overflow-hidden rounded-2xl border border-grayScale-600 bg-gray-surface">
      {/* Pôster real do filme */}
      <div className="relative w-24 shrink-0 sm:w-36 lg:w-44">
        <MoviePoster
          src={ticket.movieBanner}
          alt={ticket.movieTitle}
          sizes="176px"
          className="object-cover"
        />

        <div className="absolute inset-0 bg-linear-to-r from-transparent to-gray-surface/40" />
      </div>

      {/* Picote */}
      <div className="my-4 w-px border-l border-dashed border-grayScale-600" />

      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:flex-row sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {ticket.classification && (
              <span className="rounded bg-grayScale-700 px-1.5 py-0.5 text-[11px] font-black text-grayScale-200">
                {ticket.classification}
              </span>
            )}

            {ticket.roomType && (
              <span className="rounded bg-red-cinema px-1.5 py-0.5 text-[11px] font-bold text-white uppercase">
                {ticket.roomType}
              </span>
            )}

            {ticket.language && (
              <span className="text-[11px] font-medium text-grayScale-400">
                {ticket.language}
              </span>
            )}

            <span
              className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          <h2 className="mt-2 line-clamp-2 text-xl font-black text-white sm:text-2xl">
            {ticket.movieTitle}
          </h2>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
            <Field label="Cinema" value={ticket.cinemaName} />
            <Field label="Sala" value={ticket.roomName} />
            <Field label="Data" value={date} />
            <Field label="Horário" value={time} />
            <Field label="Assento" value={ticket.seatNumber} />
            <Field label="Tipo" value={TICKET_TYPE_LABELS[ticket.type]} />

            {holder && <Field label="Titular" value={holder} />}

            <Field label="Valor" value={formatCents(ticket.price)} highlight />
          </dl>
        </div>

        {/* QR emitido e assinado pelo backend */}
        <div className="flex shrink-0 flex-row items-center gap-3 sm:flex-col sm:justify-center">
          {ticket.qrImage ? (
            <div className="rounded-lg bg-white p-1.5">
              {/*
                `<img>` e não `next/image`: o QR é um data URL gerado a cada
                requisição, então não há o que o otimizador faça — e ele não
                sabe lidar com `data:`.
              */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.qrImage}
                alt={`QR Code do ingresso ${ticket.code}`}
                width={96}
                height={96}
                className="h-20 w-20 sm:h-24 sm:w-24"
              />
            </div>
          ) : (
            /** Ingressos emitidos antes do backend passar a assinar o QR não têm payload. */
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-grayScale-600 p-2 text-center sm:h-24 sm:w-24">
              <span className="text-[10px] leading-tight text-grayScale-500">
                QR indisponível
              </span>
            </div>
          )}

          <div className="text-left sm:text-center">
            <span className="block text-[10px] font-medium tracking-[0.08em] text-grayScale-400 uppercase">
              Código
            </span>

            <span className="font-mono text-xs font-bold text-grayScale-200">
              {ticket.code}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function Field({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
}) {
  if (!value) return null;

  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium tracking-[0.08em] text-grayScale-400 uppercase">
        {label}
      </dt>

      <dd
        className={`mt-0.5 truncate text-xs font-bold ${
          highlight ? "text-red-cinema" : "text-grayScale-200"
        }`}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}
