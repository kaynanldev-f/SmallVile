export const PRODUCT_MESSAGES = {
  PRODUCT_CREATED: 'Produto criado com sucesso.',
  PRODUCTS_FOUND: 'Produtos listados com sucesso.',
  PRODUCT_FOUND: 'Produto encontrado com sucesso.',
  PRODUCT_UPDATED: 'Produto atualizado com sucesso.',
  PRODUCT_DELETED: 'Produto removido com sucesso.',
  PRODUCT_NOT_FOUND: 'Produto não encontrado.',
  PRODUCT_ID_INVALID: 'ID do produto inválido',
  PRODUCT_ALREADY_EXISTS: 'Produto já cadastrado.',
  INVALID_PRODUCT_DATA: 'Dados do produto inválidos.',
  PRODUCT_PAYLOAD_TOO_LARGE:
    'O corpo da requisição excede o tamanho máximo permitido pelo servidor.',

  FIELD_REQUIRED: (field: string) => `O campo ${field} é obrigatório.`,

  FIELD_IS_STRING: (field: string) =>
    `O campo ${field} deve ser um texto válido.`,

  FIELD_IS_NUMBER: (field: string) =>
    `O campo ${field} deve ser um número válido.`,

  FIELD_IS_BOOLEAN: (field: string) =>
    `O campo ${field} deve ser um valor booleano (true ou false).`,

  FIELD_IS_ENUM: (field: string, values: string) =>
    `O campo ${field} deve ser um dos seguintes valores: ${values}.`,

  FIELD_LENGTH_BETWEEN: (field: string, min: number, max: number) =>
    `O campo ${field} deve ter entre ${min} e ${max} caracteres.`,

  FIELD_MIN: (field: string, min: number) =>
    `O campo ${field} deve ser de pelo menos ${min}.`,

  FIELD_ACCEPTS_ONLY: (field: string, acceptedValues: string) =>
    `O campo ${field} aceita apenas ${acceptedValues}.`,
};
