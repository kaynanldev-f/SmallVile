import QRCode from "qrcode";

/** Gera a imagem do QR Code do ingresso. */
export async function generateQrCode(content: string): Promise<string> {
  return QRCode.toDataURL(content, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}
