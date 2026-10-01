/** Limites de upload de imagem. */
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function toMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

/** Confere os arquivos antes de gastar o upload. */
export function validateImageUpload(
  files: (File | null | undefined)[],
): string | null {
  const present = files.filter((file): file is File => !!file && file.size > 0);

  const tooBig = present.find((file) => file.size > MAX_IMAGE_BYTES);

  if (tooBig) {
    return `A imagem "${tooBig.name}" tem ${toMb(tooBig.size)}. O limite é ${toMb(MAX_IMAGE_BYTES)} por arquivo.`;
  }

  const total = present.reduce((sum, file) => sum + file.size, 0);

  if (total > MAX_UPLOAD_BYTES) {
    return `As imagens somam ${toMb(total)} e o envio aceita no máximo ${toMb(MAX_UPLOAD_BYTES)}. Reduza o tamanho dos arquivos ou cadastre menos atores por vez.`;
  }

  return null;
}
