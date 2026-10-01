"use server";

import { cookies } from "next/headers";
import {
  PaymentMethod,
  isPaymentMethodAvailable,
} from "@/src/types/payments";

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("API_URL não está configurada.");
}

async function getResponseData(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function createPayment(
  orderId: string,
  method: PaymentMethod,
) {
  /** Cartão ainda não é uma forma de pagamento do sistema. */
  if (!isPaymentMethodAvailable(method)) {
    throw new Error(
      "Esta forma de pagamento ainda não está disponível. Utilize o PIX.",
    );
  }

  const token = (await cookies()).get("auth_token")?.value;

  if (!token) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await fetch(`${API_URL}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      method,
    }),
  });

  const data = await getResponseData(response);

  console.log("CREATE PAYMENT:", {
    status: response.status,
    data,
  });

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : "Erro ao criar pagamento.";

    throw new Error(
      Array.isArray(message) ? message.join(", ") : String(message),
    );
  }

  return data;
}

export async function getPaymentStatus(paymentId: string) {
  const token = (await cookies()).get("auth_token")?.value;

  if (!token) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await fetch(`${API_URL}/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const data = await getResponseData(response);

  console.log("PAYMENT STATUS:", {
    paymentId,
    status: response.status,
    data,
  });

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : "Erro ao consultar pagamento.";

    throw new Error(
      Array.isArray(message) ? message.join(", ") : String(message),
    );
  }

  return data;
}

export async function cancelPayment(orderId: string) {
  const token = (await cookies()).get("auth_token")?.value;

  if (!token) {
    throw new Error("Usuário não autenticado.");
  }

  const response = await fetch(`${API_URL}/payments/orders/${orderId}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await getResponseData(response);

  console.log("CANCEL PAYMENT:", {
    orderId,
    status: response.status,
    data,
  });

  if (!response.ok) {
    const message =
      typeof data === "object" && data !== null && "message" in data
        ? data.message
        : "Erro ao cancelar pagamento.";

    throw new Error(
      Array.isArray(message) ? message.join(", ") : String(message),
    );
  }

  return data?.data ?? data;
}
