import { Ticket } from "@/src/types/ticket";
import { formatCents } from "@/src/utils/currency";
import { TICKET_TYPE_LABELS } from "@/src/utils/ticket";

/** Versão do ingresso que vira PDF. */
export default function TicketPdfDocument({ ticket }: { ticket: Ticket }) {
  const [date, time] = ticket.sessionDateTime?.split(" ") ?? [];

  const fields: { label: string; value?: string }[] = [
    { label: "Cinema", value: ticket.cinemaName },
    { label: "Sala", value: ticket.roomName },
    { label: "Data", value: date },
    { label: "Horário", value: time },
    { label: "Assento", value: ticket.seatNumber },
    { label: "Tipo", value: TICKET_TYPE_LABELS[ticket.type] },
    { label: "Sessão", value: [ticket.roomType, ticket.language].filter(Boolean).join(" · ") },
    { label: "Valor pago", value: formatCents(ticket.price) },
  ];

  return (
    <div
      style={{
        width: "720px",
        backgroundColor: "#ffffff",
        color: "#0a0a0a",
        fontFamily: "Helvetica, Arial, sans-serif",
        padding: "32px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "2px solid #e50914",
          paddingBottom: "12px",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "20px",
              fontWeight: "bold",
              letterSpacing: "1px",
              color: "#e50914",
            }}
          >
            SMALLVILLE
          </div>

          <div style={{ fontSize: "11px", color: "#525252", marginTop: "2px" }}>
            Ingresso digital
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#525252" }}>CÓDIGO</div>

          <div
            style={{
              fontSize: "16px",
              fontWeight: "bold",
              fontFamily: "Courier, monospace",
            }}
          >
            {ticket.code}
          </div>
        </div>
      </div>

      <h1
        style={{
          fontSize: "26px",
          fontWeight: "bold",
          margin: "24px 0 4px",
          lineHeight: 1.2,
        }}
      >
        {ticket.movieTitle}
      </h1>

      {ticket.classification && (
        <div style={{ fontSize: "11px", color: "#525252" }}>
          Classificação indicativa: {ticket.classification}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: "24px",
          marginTop: "24px",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          {fields
            .filter((field) => !!field.value)
            .map((field) => (
              <div
                key={field.label}
                style={{
                  width: "50%",
                  marginBottom: "16px",
                  boxSizing: "border-box",
                  paddingRight: "12px",
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    color: "#525252",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  {field.label}
                </div>

                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "bold",
                    marginTop: "2px",
                  }}
                >
                  {field.value}
                </div>
              </div>
            ))}

          {ticket.holderName && (
            <div style={{ width: "100%" }}>
              <div
                style={{
                  fontSize: "9px",
                  color: "#525252",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Titular
              </div>

              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  marginTop: "2px",
                }}
              >
                {ticket.holderName}
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: "center" }}>
          {ticket.qrImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ticket.qrImage}
                alt={`QR Code do ingresso ${ticket.code}`}
                width={150}
                height={150}
                style={{ display: "block", border: "1px solid #e5e5e5" }}
              />

              <div
                style={{ fontSize: "9px", color: "#525252", marginTop: "6px" }}
              >
                Apresente na entrada
              </div>
            </>
          ) : (
            <div
              style={{
                width: "150px",
                height: "150px",
                border: "1px dashed #e5e5e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "10px",
                color: "#525252",
                textAlign: "center",
                padding: "8px",
                boxSizing: "border-box",
              }}
            >
              QR Code indisponível para este ingresso
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          borderTop: "1px solid #e5e5e5",
          marginTop: "16px",
          paddingTop: "12px",
          fontSize: "9px",
          color: "#525252",
          lineHeight: 1.6,
        }}
      >
        {ticket.qrPayload && <div>Identificador: {ticket.qrPayload}</div>}

        <div>
          Ingresso pessoal e intransferível. A entrada está sujeita à
          apresentação de documento com foto para meia-entrada.
        </div>
      </div>
    </div>
  );
}
