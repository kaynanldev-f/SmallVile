import Image from "next/image";
import { CatalogProduct } from "@/src/types/admin";
import { formatCents } from "@/src/utils/currency";
import SnackAddButton from "./SnackAddButton";

/** Produto da bomboniere na vitrine da Home. */
export default function HomeBomboniereCard({
  product,
  canPurchase = true,
}: {
  product: CatalogProduct;
  canPurchase?: boolean;
}) {
  const image = product.imageUrl || "/assets/promo-candy.png";
  const soldOut = !product.isAvailable || product.quantity <= 0;
  const description = [product.category, product.size]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-grayScale-600 bg-gray-surface transition-all duration-300 hover:-translate-y-1 hover:border-red-cinema">
      <div className="relative aspect-4/3 bg-grayScale-700">
        <Image
          src={image}
          alt={product.name}
          fill
          unoptimized={image.startsWith("http")}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {soldOut && (
          <div className="absolute inset-0 flex items-center justify-center bg-deep-black/70">
            <span className="rounded border border-grayScale-500 px-3 py-1 text-xs font-bold text-grayScale-300 uppercase">
              Esgotado
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="line-clamp-2 min-h-12 font-bold text-grayScale-200">
          {product.name}
        </h3>

        <p className="line-clamp-1 text-xs text-grayScale-400">{description}</p>

        <p className="mt-2 text-base font-black text-red-cinema">
          {formatCents(product.price)}
        </p>

        <div className="mt-auto pt-4">
          <SnackAddButton product={product} canPurchase={canPurchase} />
        </div>
      </div>
    </article>
  );
}
