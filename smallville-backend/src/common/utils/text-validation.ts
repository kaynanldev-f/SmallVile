/**
 * Validação de textos livres com pontuação — títulos de filme, nomes de sala
 * e sinopses.
 */

/**
 * Texto de título: letras (com acento, de qualquer alfabeto), números,
 * espaços e pontuação comum de títulos.
 */
export const FREE_TEXT_PATTERN =
  /^[\p{L}\p{N} .,:;!?&'’"“”\-–—/()+%$#@°ºª·]+$/u;

/** Pelo menos uma letra ou número. */
export const HAS_ALPHANUMERIC_PATTERN = /[\p{L}\p{N}]/u;

export const FREE_TEXT_ACCEPTED_DESCRIPTION =
  'letras, números, espaços e pontuação comum de títulos ' +
  '(- : , . ; ! ? & \' " / ( ) + %)';

/** Normalização de título: só tira espaço sobrando. */
export function normalizeFreeText(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  return value.trim().replace(/\s+/g, ' ');
}

/**
 * Conectivos que ficam em minúsculo no meio de um título — a mesma lista usada
 * por `capitalizeName` para nomes de pessoa, cinema e cidade.
 */
const TITLE_LOWERCASE_WORDS = new Set([
  'da',
  'de',
  'do',
  'das',
  'dos',
  'e',
  'a',
  'o',
  'as',
  'os',
  'em',
  'no',
  'na',
  'nos',
  'nas',
]);

/** Primeira letra do trecho em maiúscula, preservando pontuação inicial. */
function upperFirstLetter(chunk: string): string {
  return chunk.replace(/\p{L}/u, (letter) => letter.toUpperCase());
}

/**
 * Title Case para títulos livres — nome de filme e nome de sala.
 *
 * Diferente de `capitalizeName`, não força o texto todo para minúsculo antes:
 * uma palavra que já traz maiúscula foi escrita assim de propósito ("IMAX",
 * "Spider-Man", "CineVille") e é devolvida intacta. Só as palavras totalmente
 * em minúsculo são recapitalizadas, que é o caso do "sala premium" digitado
 * apressado.
 */
export function capitalizeTitle(value: unknown): unknown {
  const normalized = normalizeFreeText(value);

  if (typeof normalized !== 'string') {
    return normalized;
  }

  return normalized
    .split(' ')
    .map((word, index) => {
      // Uma maiúscula em qualquer posição indica caixa intencional.
      if (/\p{Lu}/u.test(word)) {
        return word;
      }

      const core = word.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();

      if (index > 0 && TITLE_LOWERCASE_WORDS.has(core)) {
        return word;
      }

      // "luz-camera-acao" vira "Luz-Camera-Acao": cada parte do composto
      // é uma palavra do título.
      return word.split('-').map(upperFirstLetter).join('-');
    })
    .join(' ');
}

/**
 * Capitalização natural de texto corrido — sinopse.
 *
 * Sobe para maiúscula apenas a primeira letra do texto e a primeira letra de
 * cada frase. Nada é rebaixado para minúsculo, então nomes próprios e siglas
 * que o administrador escreveu continuam como estão — e o texto nunca vira
 * Title Case.
 */
export function capitalizeSentence(value: unknown): unknown {
  const normalized = normalizeFreeText(value);

  if (typeof normalized !== 'string') {
    return normalized;
  }

  return normalized.replace(
    /(^[^\p{L}]*|[.!?…]["'’”)\]]*\s+)(\p{Ll})/gu,
    (_match, prefix: string, letter: string) => prefix + letter.toUpperCase(),
  );
}

/** Neutraliza os metacaracteres para usar um texto livre dentro de um $regex. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Chave de comparação de cidade: sem caixa, sem acento e sem espaço sobrando.
 *
 * A cidade do cinema e a do perfil do usuário são digitadas à mão nos dois
 * cadastros, então "Sao Paulo" e "são paulo" precisam casar com "São Paulo".
 */
export function cityMatchKey(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}
