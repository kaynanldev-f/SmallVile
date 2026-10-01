/** Constantes e leitura de parâmetros de paginação. */

/** Itens por página nas listagens administrativas. */
export const ADMIN_PAGE_SIZE = 10;

/** Lê um número de página válido do parâmetro da URL. */
export function parsePageParam(value?: string | string[]): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw);

  return Number.isInteger(page) && page > 0 ? page : 1;
}
