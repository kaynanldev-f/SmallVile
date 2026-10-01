"use server";

import { parse, InferInput } from "valibot";
import { resetPasswordSchema } from "../lib/schemas/resetPasswordSchema";
import { ResetPasswordState } from "../types/forgotPassword";
import * as v from "valibot";
type ResetPasswordInput = InferInput<typeof resetPasswordSchema>;

/** O backend usa a mesma mensagem de 400 para token desconhecido e para expirado. */
function isInvalidTokenMessage(message: unknown): boolean {
  return typeof message === "string" && /token/i.test(message);
}

export async function resetPassword(
  prevState: ResetPasswordState<Partial<ResetPasswordInput>>,
  formData: FormData,
): Promise<ResetPasswordState<Partial<ResetPasswordInput>>> {
  const rawData = {
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  } as Partial<ResetPasswordInput>;

  // A senha nunca volta para a tela: só o token (que já veio do link) é
  // devolvido, para o formulário continuar utilizável depois de um erro.
  const keptInputs: Partial<ResetPasswordInput> = { token: rawData.token };

  try {
    const validData = parse(resetPasswordSchema, rawData);
    const payload = {
      token: validData.token,
      newPassword: validData.password,
      confirmNewPassword: validData.confirmPassword,
    };
    const response = await fetch(
      `${process.env.API_URL}/reset-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      },
    );

    let apiData;

    try {
      apiData = await response.json();
    } catch {
      return {
        success: false,
        message: "Erro de comunicação com o servidor.",
        inputs: keptInputs,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message:
          typeof apiData?.message === "string"
            ? apiData.message
            : "Não foi possível redefinir a senha.",
        inputs: keptInputs,
        invalidToken: isInvalidTokenMessage(apiData?.message),
        errors: apiData.errors,
      };
    }

    return {
      success: true,
      message: apiData.message,
      inputs: {},
    };
  } catch (err: unknown) {
    if (err instanceof v.ValiError) {
      const issues = v.flatten(err.issues);

      return {
        success: false,
        message: "Verifique os campos.",
        inputs: keptInputs,
        // Token vazio ou truncado no link: o problema é o endereço, não a
        // senha digitada.
        invalidToken: !!issues.nested?.token?.length,
        errors: issues.nested,
      };
    }

    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro inesperado.",
      inputs: keptInputs,
    };
  }
}
