"use server";

import { cookies } from "next/headers";

export interface ProductResponse {
  _id: string;
  name: string;
  category: "BEBIDAS" | "COMIDAS" | "COMBOS";
  size?: string;
  maxLimit: number;
  quantity: number;
  price: number;
  isAvailable: boolean;
  imageUrl: string;
}

export async function getBomboniere() {
  try {
    const token = (await cookies()).get("auth_token")?.value;

    const response = await fetch(
      `${process.env.API_URL}/products/availables`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message ?? "Erro ao buscar produtos.",
      };
    }

    return {
      success: true,
      products: data.data as ProductResponse[],
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Erro interno ao buscar produtos.",
    };
  }
}
