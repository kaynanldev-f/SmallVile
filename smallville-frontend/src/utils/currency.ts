/** O backend trabalha com valores em centavos (totalAmount: 4500 = R$ 45,00). */
export function formatCents(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format((valueInCents ?? 0) / 100);
}

/** Centavos → texto editável em reais ("4500" vira "45,00"). */
export function centsToInput(valueInCents: number): string {
  return ((valueInCents ?? 0) / 100).toFixed(2).replace(".", ",");
}

/** Texto em reais → centavos. Retorna null quando não é um número válido. */
export function inputToCents(value: string): number | null {
  const normalized = value.trim().replace(/\./g, "").replace(",", ".");

  if (!normalized || !/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  return Math.round(Number(normalized) * 100);
}

/** Versão curta para eixo de gráfico ("R$ 1,2 mil" em vez de "R$ 1.234,56"). */
export function formatCentsCompact(valueInCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format((valueInCents ?? 0) / 100);
}
