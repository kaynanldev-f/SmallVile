export const MOVIE_MESSAGES = {
  MOVIES_FOUND: 'Filmes encontrados com sucesso',

  MOVIE_FOUND: 'Filme encontrado com sucesso',

  MOVIE_NOT_FOUND: 'Filme não encontrado',

  MOVIE_ID_INVALID: 'ID do filme inválido',

  MOVIE_CREATED: 'Filme criado com sucesso',

  MOVIE_UPDATED: 'Filme atualizado com sucesso',

  MOVIE_DELETED: 'Filme removido com sucesso',

  MOVIE_ALREADY_EXISTS: 'Filme já cadastrado',

  INVALID_MOVIE_DATA: 'Dados do filme inválidos',

  MOVIE_PAYLOAD_TOO_LARGE:
    'O corpo da requisição excede o tamanho máximo permitido pelo servidor.',

  FIELD_REQUIRED: (field: string) => `O campo ${field} é obrigatório.`,

  FIELD_IS_STRING: (field: string) => `O campo ${field} deve ser uma string.`,

  FIELD_IS_NUMBER: (field: string) => `O campo ${field} deve ser um número.`,

  FIELD_LENGTH_BETWEEN: (field: string, min: number, max: number) =>
    `O campo ${field} deve ter entre ${min} e ${max} caracteres.`,

  FIELD_INVALID_FORMAT: (field: string, format: string) =>
    `O campo ${field} deve seguir o formato: ${format}.`,

  FIELD_NEEDS_ALPHANUMERIC: (field: string) =>
    `O campo ${field} deve conter ao menos uma letra ou número.`,
  FIELD_ACCEPTS_ONLY: (field: string, acceptedValues: string) =>
    `O campo ${field} aceita apenas ${acceptedValues}.`,
};
