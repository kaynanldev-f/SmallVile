export const CINEMA_MESSAGES = {
  CINEMA_CREATED: 'Cinema criado com sucesso.',
  CINEMA_ALREADY_EXISTS: 'Já existe um cinema cadastrado com este nome.',
  CINEMA_FOUND: 'Cinema(s) encontrado(s) com sucesso.',
  CINEMA_NOT_FOUND: 'Cinema não encontrado.',
  CINEMA_UPDATED: 'Cinema atualizado com sucesso.',
  CINEMA_DELETED: 'Cinema removido com sucesso.',
  CINEMA_ID_INVALID: 'ID do cinema inválido.',
  MOVIE_ID_INVALID: 'ID do filme inválido.',
  MOVIE_ALREADY_ATTACHED: 'Este filme já está anexado a este cinema.',
  MOVIE_NOT_ATTACHED: 'Este filme não está anexado a este cinema.',
  MOVIE_ATTACHED: 'Filme anexado ao cinema com sucesso.',
  MOVIE_DETACHED: 'Filme removido do cinema com sucesso.',
  INVALID_CINEMA_DATA: 'Dados inválidos para o cinema.',
  FIELD_REQUIRED: (field: string) => `${field} é obrigatório.`,
  FIELD_IS_STRING: (field: string) => `${field} deve ser um texto.`,
  FIELD_LENGTH_BETWEEN: (field: string, min: number, max: number) =>
    `O campo ${field} deve ter entre ${min} e ${max} caracteres.`,
  FIELD_ACCEPTS_ONLY: (field: string, what: string) =>
    `O campo ${field} aceita apenas ${what}.`,
} as const;
