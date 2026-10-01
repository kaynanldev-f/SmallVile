"use server";

import { parse, InferInput } from "valibot";
import { RegisterState } from "../types";
import { registerSchema } from "../lib/schemas/registerSchema";
import { formatDate } from "../utils/date";
type RegisterInput = InferInput<typeof registerSchema>;

export async function RegisterUser(
  prevState: RegisterState<Partial<RegisterInput>>,
  FormData: FormData,
): Promise<RegisterState<Partial<RegisterInput>>> {
  const rawData = {
    name: FormData.get("name"),
    surname: FormData.get("surname"),
    email: FormData.get("email"),
    password: FormData.get("password"),
    confirmPassword: FormData.get("confirmPassword"),
    termsAccepted: FormData.get("termsAccepted") !== null,
    privacyAccepted: FormData.get("privacyAccepted") !== null,
    cpf: FormData.get("cpf"),
    birthDate: formatDate(FormData.get("birthDate") as string),
    phone: FormData.get("phone"),
    cep: FormData.get("cep"),
    address: FormData.get("address"),
    number: FormData.get("number"),
    complement: FormData.get("complement") || undefined,
    neighborhood: FormData.get("neighborhood"),
    city: FormData.get("city"),
    state: FormData.get("state"),
    gender: FormData.get("gender") || undefined,
  } as Partial<RegisterInput>;

  try {
    const validData = parse(registerSchema, rawData);

    const response = await fetch(
      process.env.API_URL + "/register",
      {
        method: "POST",
        body: JSON.stringify(validData),
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      },
    );

    let apiData;
    try {
      apiData = await response.json();
    } catch (err) {
      return {
        success: false,
        message: "Erro de comunicação com o servidor (Resposta inválida).",
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
      message: (err as Error).message,
      inputs: rawData,
    };
  }
}
