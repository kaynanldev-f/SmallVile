import {
  object,
  string,
  boolean,
  email,
  minLength,
  maxLength,
  regex,
  pipe,
  nonEmpty,
  forward,
  trim,
  InferInput,
  partialCheck,
  literal,
  optional,
  picklist,
} from "valibot";

export const registerSchema = pipe(
  object({
    name: pipe(
      string("O campo nome é obrigatório"),
      nonEmpty("O campo nome é obrigatório"),
      trim(),
      minLength(2, "O campo nome deve conter entre 2 e 50 caracteres"),
      maxLength(50, "O campo nome deve conter entre 2 e 50 caracteres"),
      regex(
        /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/,
        "O campo Nome aceita apenas letras, acentuação e espaços",
      ),
    ),
    surname: pipe(
      string("O campo sobrenome é obrigatório"),
      nonEmpty("O campo sobrenome é obrigatório"),
      trim(),
      minLength(2, "O campo Sobrenome deve conter entre 2 e 50 caracteres"),
      maxLength(50, "O campo Sobrenome deve conter entre 2 e 50 caracteres"),
      regex(
        /^[A-Za-zÀ-ÖØ-öø-ÿ ]+$/,
        "O campo Sobrenome aceita apenas letras, acentuação e espaços",
      ),
    ),
    email: pipe(
      string("O campo e-mail é obrigatório."),
      nonEmpty("O campo e-mail é obrigatório."),
      trim(),
      email("O formato do e-mail parece inválido."),
      regex(
        /@.*\.(com|com\.br)$/,
        "O campo e-mail deve ter o formato (nome@dominio.com ou nome@dominio.com.br)",
      ),
      maxLength(50, "O campo e-mail deve permitir no máximo 50 caracteres"),
    ),
    password: pipe(
      string("O campo senha é obrigatório."),
      nonEmpty("O campo senha é obrigatório."),
      regex(/^\S+$/, "A senha não pode haver espaços em branco."),
      minLength(6, "A senha deve conter no mínimo 6 caracteres."),
      maxLength(10, "A senha deve conter no máximo 10 caracteres."),
      regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula."),
      regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula."),
      regex(/[0-9]/, "A senha deve conter pelo menos um número."),
      regex(
        /[^a-zA-Z0-9]/,
        "A senha deve conter pelo menos um caractere especial.",
      ),
    ),
    confirmPassword: pipe(
      string("O campo confirmar senha é obrigatório."),
      nonEmpty("O campo confirmar senha é obrigatório."),
    ),
    termsAccepted: pipe(
      boolean(),
      literal(true, "Você deve aceitar os Termos e Políticas."),
    ),
    privacyAccepted: pipe(
      boolean(),
      literal(true, "Você deve aceitar a Política de Privacidade."),
    ),
    cpf: pipe(
      string("O campo CPF é obrigatório."),
      nonEmpty("O campo CPF é obrigatório."),
      regex(
        /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
        "CPF inválido. Use o formato 000.000.000-00",
      ),
    ),
    birthDate: pipe(
      string("O campo data de nascimento é obrigatório."),
      nonEmpty("O campo data de nascimento é obrigatório."),
      regex(
        /^\d{2}\/\d{2}\/\d{4}$/,
        "A data deve estar no formato DD/MM/AAAA.",
      ),
    ),
    phone: pipe(
      string("O campo telefone é obrigatório."),
      nonEmpty("O campo telefone é obrigatório."),
      regex(
        /^\(?\d{2}\)?\s?\d{4,5}-\d{4}$/,
        "Telefone inválido. Use o formato (84)99999-9999",
      ),
    ),
    cep: pipe(
      string("O campo CEP é obrigatório."),
      nonEmpty("O campo CEP é obrigatório."),
      regex(/^\d{5}-\d{3}$/, "CEP inválido. Use o formato 00000-000"),
    ),
    address: pipe(
      string("O campo endereço é obrigatório."),
      nonEmpty("O campo endereço é obrigatório."),
    ),
    number: optional(pipe(string())),
    complement: optional(pipe(string())),
    neighborhood: pipe(
      string("O campo bairro é obrigatório."),
      nonEmpty("O campo bairro é obrigatório."),
    ),
    city: pipe(
      string("O campo cidade é obrigatório."),
      nonEmpty("O campo cidade é obrigatório."),
    ),
    state: pipe(
      string("O campo estado é obrigatório."),
      nonEmpty("O campo estado é obrigatório."),
      regex(/^[A-Z]{2}$/, "Use a sigla do estado. Ex: RN, SP, RJ"),
    ),
    gender: optional(
      pipe(
        picklist(
          ["Masculino", "Feminino", "Outro", "Prefiro não informar"],
          "Selecione um gênero válido.",
        ),
      ),
    ),
  }),
  forward(
    partialCheck(
      [["password"], ["confirmPassword"]],
      (input) => input.password === input.confirmPassword,
      "As senhas devem ser iguais.",
    ),
    ["confirmPassword"],
  ),
);

export type registerSchema = InferInput<typeof registerSchema>;
