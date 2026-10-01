import * as v from "valibot";

/** Redefinição de senha pelo link do e-mail. */
export const resetPasswordSchema = v.pipe(
  v.object({
    token: v.pipe(
      v.string("Link de redefinição inválido."),
      v.trim(),
      v.nonEmpty(
        "Link de redefinição inválido ou incompleto. Solicite um novo e-mail.",
      ),
    ),
    password: v.pipe(
      v.string("O campo senha é obrigatório."),
      v.nonEmpty("O campo senha é obrigatório."),
      v.regex(/^\S+$/, "A senha não pode haver espaços em branco."),
      v.minLength(6, "A senha deve conter no mínimo 6 caracteres."),
      v.maxLength(10, "A senha deve conter no máximo 10 caracteres."),
      v.regex(/[a-z]/, "A senha deve conter pelo menos uma letra minúscula."),
      v.regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula."),
      v.regex(/[0-9]/, "A senha deve conter pelo menos um número."),
      v.regex(
        /[^a-zA-Z0-9]/,
        "A senha deve conter pelo menos um caractere especial.",
      ),
    ),
    confirmPassword: v.pipe(
      v.string("Confirme sua senha."),
      v.nonEmpty("Confirme sua senha."),
    ),
  }),
  v.forward(
    v.check(
      (input) => input.password === input.confirmPassword,
      "As senhas não coincidem.",
    ),
    ["confirmPassword"],
  ),
);
