"use server";

import { revalidatePath } from "next/cache";
import { apiRequest } from "@/src/lib/api";
import { ActionResult, AdminProduct } from "@/src/types/admin";

const PATH = "/admin/products";
const STOCK_PATH = "/admin/stock";

/**
 * O backend usa `@Transform(({ value }) => Number(value))` sem guarda de
 * `undefined` em maxLimit/quantity/price e converte `isAvailable` ausente para
 * `false`.
 */
function buildProductFormData(
  product: Omit<AdminProduct, "_id" | "imageUrl">,
  image?: File | null,
): FormData {
  const form = new FormData();

  form.append("name", product.name);
  form.append("category", product.category);
  form.append("maxLimit", String(product.maxLimit));
  form.append("quantity", String(product.quantity));
  form.append("price", String(product.price));
  form.append("isAvailable", String(product.isAvailable));

  if (product.size) form.append("size", product.size);
  if (image && image.size > 0) form.append("image", image);

  return form;
}

export async function listProducts(): Promise<ActionResult<AdminProduct[]>> {
  const result = await apiRequest<AdminProduct[]>("/products", {
    fallbackError: "Não foi possível carregar os produtos.",
  });

  if (!result.success) return result;

  return { success: true, data: result.data ?? [] };
}

export async function getProduct(
  id: string,
): Promise<ActionResult<AdminProduct>> {
  return apiRequest<AdminProduct>(`/products/${id}`, {
    fallbackError: "Produto não encontrado.",
  });
}

export async function createProduct(
  product: Omit<AdminProduct, "_id" | "imageUrl">,
  image: File | null,
): Promise<ActionResult<AdminProduct>> {
  if (!image || image.size === 0) {
    return { success: false, error: "A imagem do produto é obrigatória." };
  }

  const result = await apiRequest<AdminProduct>("/products", {
    method: "POST",
    formData: buildProductFormData(product, image),
    fallbackError: "Não foi possível cadastrar o produto.",
  });

  if (result.success) {
    revalidatePath(PATH);
    revalidatePath(STOCK_PATH);
  }

  return result;
}

export async function updateProduct(
  id: string,
  product: Omit<AdminProduct, "_id" | "imageUrl">,
  image?: File | null,
): Promise<ActionResult<AdminProduct>> {
  const result = await apiRequest<AdminProduct>(`/products/${id}`, {
    method: "PATCH",
    formData: buildProductFormData(product, image),
    fallbackError: "Não foi possível atualizar o produto.",
  });

  if (result.success) {
    revalidatePath(PATH);
    revalidatePath(STOCK_PATH);
  }

  return result;
}

export async function deleteProduct(id: string): Promise<ActionResult<null>> {
  const result = await apiRequest<null>(`/products/${id}`, {
    method: "DELETE",
    fallbackError: "Não foi possível remover o produto.",
  });

  if (result.success) {
    revalidatePath(PATH);
    revalidatePath(STOCK_PATH);
  }

  return result;
}

/** Ajuste de estoque. */
export async function updateStock(
  id: string,
  quantity: number,
): Promise<ActionResult<AdminProduct>> {
  if (!Number.isInteger(quantity) || quantity < 0) {
    return { success: false, error: "A quantidade deve ser 0 ou mais." };
  }

  const current = await getProduct(id);

  if (!current.success) return current;

  return updateProduct(id, {
    name: current.data.name,
    category: current.data.category,
    size: current.data.size,
    maxLimit: current.data.maxLimit,
    quantity,
    price: current.data.price,
    isAvailable: current.data.isAvailable,
  });
}
