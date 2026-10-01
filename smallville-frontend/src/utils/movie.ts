/** Cores da tarja de classificação indicativa, seguindo o padrão brasileiro. */
const CLASSIFICATION_COLORS: Record<string, string> = {
  L: "bg-green-600",
  "6": "bg-blue-500",
  "10": "bg-yellow-500 text-black",
  "12": "bg-amber-500 text-black",
  "14": "bg-orange-600",
  "16": "bg-red-600",
  "18": "bg-black border border-white",
};

export function classificationColor(classification?: string): string {
  if (!classification) return "bg-grayScale-600";

  return CLASSIFICATION_COLORS[classification] ?? "bg-grayScale-600";
}

/** Minutos → "2h 15min". String vazia quando a duração não veio. */
export function formatDuration(minutes?: number): string {
  if (!minutes) return "";

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  if (!hours) return `${rest}min`;

  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

/** Linha de metadados do card: "Ação, Drama · 2h 15min". */
export function movieMetaLine(genres?: string[], duration?: number): string {
  return [genres?.join(", "), formatDuration(duration)]
    .filter(Boolean)
    .join(" · ");
}
