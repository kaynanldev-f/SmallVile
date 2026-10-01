/**
 * Normalização de caixa dos textos livres do cadastro.
 *
 * O sistema já tem um padrão: nome de usuário, nome/endereço/cidade do cinema
 * passam pelo `capitalizeName` do backend (Title Case com conectivos em
 * minúscula). Estas funções repetem a mesma régua no formulário, para que o
 * administrador veja e envie exatamente o valor que ficará gravado — e são
 * idempotentes, então aplicar de novo no backend não muda o resultado.
 *
 * O valor armazenado continua sendo o texto completo: aqui só se corrige a
 * caixa, nada é cortado.
 */

/** Conectivos que ficam em minúscula no meio do texto (igual ao backend). */
const LOWERCASE_WORDS = [
  "da",
  "de",
  "do",
  "das",
  "dos",
  "e",
  "a",
  "o",
  "as",
  "os",
  "em",
  "no",
  "na",
  "nos",
  "nas",
];

/** Tira espaço sobrando sem mexer na caixa — mesmo `normalizeFreeText`. */
export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Title Case do sistema: "sala premium" → "Sala Premium",
 * "sala de cinema" → "Sala de Cinema".
 */
export function capitalizeWords(value: string): string {
  return normalizeSpaces(value)
    .toLowerCase()
    .split(" ")
    .map((word, index) =>
      index === 0 || !LOWERCASE_WORDS.includes(word)
        ? word.charAt(0).toUpperCase() + word.slice(1)
        : word,
    )
    .join(" ");
}

/**
 * Título de filme: só recapitaliza quando o administrador digitou tudo em
 * minúsculas ("vingadores ultimato" → "Vingadores Ultimato"). Se ele usou
 * maiúscula em algum ponto, a caixa é dele — "Spider-Man: No Way Home" não
 * pode virar "Spider-man: No Way Home".
 */
export function capitalizeMovieTitle(value: string): string {
  const normalized = normalizeSpaces(value);

  return normalized === normalized.toLowerCase()
    ? capitalizeWords(normalized)
    : normalized;
}

/**
 * Sinopse: texto corrido com capitalização natural. Só a primeira letra do
 * texto e a de cada frase nova sobem — "esta é uma história sobre..." vira
 * "Esta é uma história sobre...", nunca "Esta É Uma História Sobre...".
 */
export function capitalizeSentence(value: string): string {
  return normalizeSpaces(value).replace(
    /(^|[.!?]\s+)(\p{Ll})/gu,
    (_match, prefix: string, letter: string) => prefix + letter.toUpperCase(),
  );
}
