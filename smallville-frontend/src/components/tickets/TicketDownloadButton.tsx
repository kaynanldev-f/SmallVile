"use client";

import { useRef, useState } from "react";
import DownloadIcon from "@mui/icons-material/DownloadOutlined";
import { Ticket } from "@/src/types/ticket";
import TicketPdfDocument from "./TicketPdfDocument";

/** Baixa o ingresso em PDF. */
export default function TicketDownloadButton({ ticket }: { ticket: Ticket }) {
  const documentRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    const element = documentRef.current;

    if (!element) return;

    setLoading(true);
    setError(null);

    try {
      const { default: html2pdf } = await import("html2pdf.js");

      await html2pdf()
        .set({
          margin: 0,
          filename: `ingresso-${ticket.code}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, backgroundColor: "#ffffff", useCORS: true },
          jsPDF: { unit: "px", format: [720, 520], orientation: "landscape" },
        })
        .from(element)
        .save();
    } catch (downloadError) {
      console.error("[ticket] falha ao gerar PDF", downloadError);

      setError("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-grayScale-600 bg-gray-surface px-4 py-2 text-sm font-bold text-grayScale-200 transition-colors hover:border-red-cinema disabled:cursor-not-allowed disabled:opacity-60"
        >
          <DownloadIcon className="text-[18px]" />
          {loading ? "Gerando PDF..." : "Baixar PDF"}
        </button>

        {error && (
          <span role="alert" className="text-xs text-red-400">
            {error}
          </span>
        )}
      </div>

      {/*
        Fora da tela, mas renderizado: o html2canvas precisa medir o elemento,
        e `display: none` devolveria um PDF em branco.
      */}
      <div aria-hidden className="pointer-events-none fixed -left-[9999px] top-0">
        <div ref={documentRef}>
          <TicketPdfDocument ticket={ticket} />
        </div>
      </div>
    </>
  );
}
