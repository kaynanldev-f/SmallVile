export const USER_MESSAGES = {
  USER_ALREADY_REGISTERED: 'Usuário já existe.',
  REGISTRATION_SUCCESS: 'Parabéns! Cadastro realizado com sucesso.',
  EMAIL_ALREADY_REGISTERED: 'Este e-mail já foi cadastrado.',
  EMAIL_MAX_LENGTH: 'Email deve ter no máximo 50 caracteres.',
  EMAIL_INVALID_FORMAT: 'O e-mail inserido é inválido.',
  PASSWORD_RULES:
    'Senha precisa conter: uma letra maiúscula, minúscula, número, e um caractere especial(@#$%).',
  PASSWORD_NO_SPACES: 'A senha não pode conter espaços.',
  PASSWORD_MIN_LENGTH: 'A senha deve ter no mínimo 6 caracteres.',
  PASSWORD_MAX_LENGTH: 'A senha deve ter no máximo 20 caracteres.',
  PASSWORD_CHANGED: 'Senha alterada com sucesso!',
  CONFIRM_PASSWORD_MUST_MATCH: 'As senhas não conferem.',
  EMAIL_OR_PASSWORD_INCORRECT: 'E-mail ou senha incorretos.',
  USER_NOT_FOUND: 'Usuário não encontrado.',
  USER_FOUND: 'Usuário encontrado.',
  USERS_FOUND: 'Usuários encontrados.',
  USER_UPDATED: 'Usuário atualizado.',
  USER_DELETED: 'Usuário excluído.',
  USER_ID_INVALID: 'ID de usuário inválido.',
  LOGIN_SUCCESS: 'Login realizado com sucesso.',
  TERMS_NOT_ACCEPTED: 'Você precisa aceitar os termos e condições.',
  INVALID_TOKEN: 'Token inválido ou expirado.',
  VALID_TOKEN: 'Token válido.',
  RESET_LINK_EXPIRED:
    'Este link de redefinição expirou ou já foi utilizado. Solicite um novo.',
  LINK_SENT: 'Um link de recuperação foi enviado.',

  FIELD_MAX_LENGTH: (field: string, max: number) =>
    `O campo ${field} deve ter no máximo ${max} caracteres.`,
  FIELD_MIN_LENGTH: (field: string, min: number) =>
    `O campo ${field} deve ter no mínimo ${min} caracteres.`,
  FIELD_REQUIRED: (field: string) => `O campo ${field} é obrigatório.`,
  FIELD_ACCEPTS_ONLY: (field: string, what: string) =>
    `O campo ${field} aceita apenas ${what}.`,
  FIELD_IS_STRING: (field: string) => `O campo ${field} deve ser uma string.`,
  FIELD_LENGTH_BETWEEN: (field: string, min: number, max: number) =>
    `O campo ${field} deve ter entre ${min} e ${max} caracteres.`,
  FIELD_ONLY_LETTERS_SPACES: (field: string) =>
    `O campo ${field} deve conter apenas letras e espaços.`,
};
