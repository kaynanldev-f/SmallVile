"use client";

import { Copy, QrCode } from "lucide-react";
import { useState } from "react";
import { usePixTimer } from "@/src/hooks/usePixTimer";
import Image from "next/image";
interface PixPaymentProps {
  qrCode?: string;
  copyPasteCode?: string;
  expiresIn?: number;
}

export default function PixPayment({
  qrCode,
  copyPasteCode,
  expiresIn = 600,
}: PixPaymentProps) {
  const [copied, setCopied] = useState(false);

  const { formattedTime, expired } = usePixTimer({
    initialTime: 600,
    onExpire: () => {
      console.log("PIX expirou");
    },
  });
  async function handleCopy() {
    if (!copyPasteCode) return;

    await navigator.clipboard.writeText(copyPasteCode);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      <h2 className="mb-6 text-xl font-semibold">Pagamento via PIX</h2>

      <div className="flex flex-col items-center">
        <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-white">
          {qrCode ? (
            <Image
              src={qrCode}
              alt="QR Code Pix"
              width={200}
              height={200}
              unoptimized
            />
          ) : (
            <QrCode size={120} className="text-zinc-400" />
          )}
        </div>

        <p className="mt-6 text-sm text-zinc-400">
          Escaneie o QR Code utilizando o aplicativo do seu banco.
        </p>
      </div>

      <div className="mt-8">
        <label className="mb-2 block text-sm">PIX Copia e Cola</label>

        <div className="flex gap-2">
          <input
            readOnly
            value={copyPasteCode ?? "00020126360014BR.GOV.BCB.PIX..."}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm"
          />

          <button
            onClick={handleCopy}
            className="rounded-lg bg-red-600 px-4 transition hover:bg-red-700"
          >
            <Copy size={18} />
          </button>
        </div>

        {copied && (
          <p className="mt-2 text-sm text-green-500">Código copiado!</p>
        )}
      </div>

      <div className="mt-8 rounded-lg border border-yellow-600/30 bg-yellow-500/10 p-4">
        <h3 className="font-medium">Tempo restante</h3>

        <p className="mt-2 text-3xl font-bold text-yellow-400">
          {formattedTime}
        </p>

        <p className="mt-2 text-sm text-zinc-400">
          Após esse período o pagamento será cancelado automaticamente.
        </p>
      </div>
    </section>
  );
}
