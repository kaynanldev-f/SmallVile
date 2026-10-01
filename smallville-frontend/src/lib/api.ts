import { cookies } from "next/headers";
import { ActionResult } from "@/src/types/admin";

const API_URL = process.env.API_URL!;

async function authHeader(): Promise<Record<string, string>> {
  const token = (await cookies()).get("auth_token")?.value;

  return token ? { Authorization: `Bearer ${token}` } : {};
}

function extractError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "message" in payload) {
    const message = (payload as { message: unknown }).message;

    // O ValidationPipe do Nest devolve message como array de strings.
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }

  return fallback;
}

interface RequestOptions {
  method?: string;
  /** Enviado como JSON. Ignorado se `formData` for passado. */
  body?: unknown;
  /** Para rotas multipart (filmes e produtos). */
  formData?: FormData;
  fallbackError?: string;
  /** Devolve o envelope inteiro em vez de apenas `data`. */
  keepEnvelope?: boolean;
}

/** Chama o backend já autenticado e normaliza a resposta. */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ActionResult<T>> {
  const {
    method = "GET",
    body,
    formData,
    fallbackError = "Não foi possível concluir a operação.",
    keepEnvelope = false,
  } = options;

  try {
    const headers = await authHeader();

    if (body !== undefined && !formData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
      cache: "no-store",
    });

    // 204 e afins não têm corpo.
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return { success: false, error: extractError(payload, fallbackError) };
    }

    const data =
      !keepEnvelope && payload && typeof payload === "object" && "data" in payload
        ? (payload as { data: T }).data
        : (payload as T);

    return { success: true, data };
  } catch (error) {
    console.error(`[api] ${method} ${path}`, error);

    return {
      success: false,
      error:
        error instanceof SyntaxError
          ? "Resposta inválida do servidor."
          : "Falha na conexão com o servidor.",
    };
  }
}
