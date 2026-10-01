"use client";

import Link from "next/link";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ShoppingCart, Check, Lock } from "@mui/icons-material";
import { CatalogProduct } from "@/src/types/admin";
import {
  getSnackQuantity,
  setSnackQuantity,
  subscribeToSnackPreselection,
} from "@/src/lib/snackPreselection";

interface SnackAddButtonProps {
  product: CatalogProduct;
  /** Botão maior, usado no destaque da bomboniere. */
  size?: "sm" | "lg";
  /** O visitante pode comprar? */
  canPurchase?: boolean;
}

/** Controle de quantidade + "adicionar" de um produto da bomboniere. */
export default function SnackAddButton({
  product,
  size = "sm",
  canPurchase = true,
}: SnackAddButtonProps) {
  const maxQuantity = Math.max(
    0,
    Math.min(product.maxLimit || 0, product.quantity || 0),
  );

  const [quantity, setQuantity] = useState(1);

  // A pré-seleção vive no localStorage, fora do React. `useSyncExternalStore`
  // é o que mantém o contador em dia sem efeito nem setState em render — e
  // devolve 0 no servidor, evitando divergência de hidratação.
  const selected = useSyncExternalStore(
    subscribeToSnackPreselection,
    useCallback(() => getSnackQuantity(product._id), [product._id]),
    () => 0,
  );

  const isLarge = size === "lg";

  if (!product.isAvailable || product.quantity <= 0) {
    return (
      <p className="text-xs text-grayScale-500">Indisponível no momento.</p>
    );
  }

  // Visitante VÊ o produto, mas no lugar do controle de quantidade recebe o
  // convite para o login.
  if (!canPurchase) {
    return (
      <Link
        href="/login"
        aria-label={`Entrar para comprar ${product.name}`}
        className={`flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-md border border-red-cinema/50 bg-red-cinema/10 font-bold text-red-cinema transition-all hover:bg-red-cinema hover:text-white ${
          isLarge ? "px-6 py-3 text-base" : "px-3 py-2 text-xs"
        }`}
      >
        <Lock sx={{ fontSize: isLarge ? 20 : 16 }} />
        Entrar para comprar
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center gap-2 ${isLarge ? "gap-3" : ""}`}>
        <div className="flex items-center gap-1 rounded-lg border border-grayScale-600">
          <button
            type="button"
            aria-label={`Diminuir quantidade de ${product.name}`}
            onClick={() => setQuantity((value) => Math.max(1, value - 1))}
            disabled={quantity <= 1}
            className={`cursor-pointer font-black text-grayScale-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${
              isLarge ? "h-11 w-11 text-xl" : "h-8 w-8 text-lg"
            }`}
          >
            −
          </button>

          <span
            aria-live="polite"
            className={`text-center font-bold text-grayScale-200 ${
              isLarge ? "w-7 text-base" : "w-5 text-sm"
            }`}
          >
            {quantity}
          </span>

          <button
            type="button"
            aria-label={`Aumentar quantidade de ${product.name}`}
            onClick={() =>
              setQuantity((value) => Math.min(maxQuantity, value + 1))
            }
            disabled={quantity >= maxQuantity}
            className={`cursor-pointer font-black text-grayScale-300 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40 ${
              isLarge ? "h-11 w-11 text-xl" : "h-8 w-8 text-lg"
            }`}
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => setSnackQuantity(product._id, quantity)}
          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md bg-button-primary font-bold text-white transition-all hover:scale-105 ${
            isLarge ? "px-6 py-3 text-base" : "px-3 py-2 text-xs"
          }`}
        >
          <ShoppingCart sx={{ fontSize: isLarge ? 20 : 16 }} />
          Adicionar
        </button>
      </div>

      {selected > 0 && (
        <p className="flex items-center gap-1 text-[11px] font-bold text-green-400">
          <Check sx={{ fontSize: 14 }} />
          {selected} separado{selected > 1 ? "s" : ""} para a próxima compra
        </p>
      )}
    </div>
  );
}
