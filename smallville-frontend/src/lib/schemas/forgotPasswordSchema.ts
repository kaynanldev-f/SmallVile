import * as v from "valibot";

export const forgotPasswordSchema = v.object({
  email: v.pipe(
    v.string(),
    v.nonEmpty("O e-mail é obrigatório."),
    v.email("E-mail inválido."),
  ),
});
