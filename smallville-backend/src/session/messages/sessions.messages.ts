export const SESSION_MESSAGES = {
  SESSION_CREATED: 'Sessão criada com sucesso.',
  SESSION_UPDATED: 'Sessão atualizada com sucesso',
  SESSIONS_FOUND: 'Sessões encontradas.',
  SESSION_FOUND: 'Sessão encontrada.',
  SESSION_NOT_FOUND: 'Sessão não encontrada.',
  SESSION_DELETED: 'Sessão excluída com sucesso.',
  SESSION_ID_INVALID: 'ID de sessão inválido.',
  SESSION_INVALID_REQUEST: 'Erro de validação ou mapa de assentos inválido.',
  SESSION_SEAT_INVALID: 'Tipo de assento inválido.',

  SESSION_BEFORE_MOVIE_RELEASE: (releaseDate: string) =>
    'Não é possível criar uma sessão antes da data de estreia do filme. ' +
    `A estreia acontece em ${releaseDate}.`,

  ROOM_CAPACITY_INVALID: (received: number) =>
    `A sala deve ter exatamente 120 assentos cadastrados. Enviado: ${received}.`,
  SEAT_CONFLICT:
    'Erro de mapa: Existem dois ou mais assentos ocupando o mesmo lugar/número.',
  SEAT_COUNT_INVALID: (type: string, expected: number, received: number) =>
    `Quantidade incorreta de ${type}. Esperado: ${expected}, Enviado: ${received}.`,

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
