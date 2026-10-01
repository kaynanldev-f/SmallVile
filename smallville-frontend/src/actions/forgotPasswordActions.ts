"use server";

import { parse, InferInput } from "valibot";
import { forgotPasswordSchema } from "../lib/schemas/forgotPasswordSchema";
import { ForgotPasswordState } from "../types/forgotPassword";

type ForgotPasswordInput = InferInput<typeof forgotPasswordSchema>;

export async function forgotPassword(
  prevState: ForgotPasswordState<Partial<ForgotPasswordInput>>,
  formData: FormData,
): Promise<ForgotPasswordState<Partial<ForgotPasswordInput>>> {
  const rawData = {
    email: formData.get("email"),
  } as Partial<ForgotPasswordInput>;

  try {
    const validData = parse(forgotPasswordSchema, rawData);

    const response = await fetch(
      `${process.env.API_URL}/forgot-password`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validData),
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
        inputs: rawData,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        message: apiData.message,
        inputs: rawData,
        errors: apiData.errors,
      };
    }

    return {
      success: true,
      message: apiData.message,
      inputs: {},
    };
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Erro inesperado.",
      inputs: rawData,
    };
  }
}
