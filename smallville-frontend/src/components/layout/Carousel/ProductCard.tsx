"use client";

import Image from "next/image";

export interface Product {
  id: string;
  name: string;
  size: string;
  price: number;
  limit: number;
  description?: string;
  image: string;
}

export default function ProductCard({
  product,
  quantity,
  onAdd,
  onRemove,
  limitReached,
}: {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
  limitReached: boolean;
}) {
  return (
    <div className="bg-gray-surface rounded-xl overflow-hidden flex flex-col border border-grayScale-600 h-full max-h-80 w-full hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group">
      <div className="relative w-full h-56 bg-grayScale-600 overflow-hidden">
        <div className="relative w-full h-56 overflow-hidden rounded-t-xl bg-[#111]">
          <Image
            src={product.image}
            alt={product.name}
            fill
            quality={100}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />

          <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-deep-black/60 to-transparent" />
        </div>
      </div>

      <div className="p-5 flex flex-col gap-2 flex-1">
        <h3 className="font-bold text-base text-grayScale-200">
          {product.name}
        </h3>

        {product.description && (
          <p className="text-grayScale-400 text-xs leading-relaxed">
            {product.description}
          </p>
        )}

        <p className="text-grayScale-400 text-sm">{product.size}</p>

        <p className="text-red-cinema font-black text-base mt-1">
          R$ {product.price.toFixed(2).replace(".", ",")}
        </p>

        {limitReached && (
          <p className="text-red-cinema text-xs font-semibold leading-snug mt-2">
            Limite máximo atingido.
          </p>
        )}

        <div className="flex items-center gap-3 mt-auto pt-4">
          <button
            onClick={onRemove}
            disabled={quantity === 0}
            className="w-10 h-10 rounded-full bg-grayScale-600 text-grayScale-200 font-black text-xl flex items-center justify-center hover:bg-grayScale-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            −
          </button>
          <span className="text-grayScale-200 font-bold text-base w-6 text-center">
            {quantity}
          </span>
          <button
            onClick={onAdd}
            disabled={limitReached}
            className="w-10 h-10 rounded-full bg-red-cinema text-white font-black text-xl flex items-center justify-center hover:bg-button-primary-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
