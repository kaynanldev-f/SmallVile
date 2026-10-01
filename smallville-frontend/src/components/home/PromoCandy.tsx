import Image from "next/image";
import { CatalogProduct } from "@/src/types/admin";
import { formatCents } from "@/src/utils/currency";
import SnackAddButton from "./SnackAddButton";

/** Destaque da bomboniere. */
export default function PromoCandy({
  product,
  canPurchase = true,
}: {
  product: CatalogProduct;
  canPurchase?: boolean;
}) {
  const image = product.imageUrl || "/assets/promo-candy.png";
  const description = [product.category, product.size]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-10 flex flex-col items-center gap-10 rounded-2xl border border-grayScale-600 bg-gray-surface p-6 lg:flex-row lg:items-stretch lg:gap-10 lg:p-8">
      <div className="relative aspect-16/10 w-full overflow-hidden rounded-xl bg-grayScale-700 lg:max-w-[50%]">
        <Image
          src={image}
          alt={product.name}
          fill
          unoptimized={image.startsWith("http")}
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      <div className="flex w-full flex-col items-start justify-center lg:max-w-[50%]">
        <span className="mb-4 rounded bg-red-cinema px-2 py-1 text-xs font-bold text-white uppercase">
          Destaque da bomboniere
        </span>

        <h3 className="text-3xl leading-tight font-bold text-white sm:text-4xl">
          {product.name}
        </h3>

        {description && (
          <p className="mt-3 text-sm text-grayScale-400">{description}</p>
        )}

        <p className="mt-6 text-4xl font-bold text-white sm:text-5xl">
          {formatCents(product.price)}
        </p>

        <p className="mt-2 text-xs text-grayScale-500">
          {product.quantity > 0
            ? `${product.quantity} disponíveis · limite de ${product.maxLimit} por pedido`
            : "Sem estoque no momento"}
        </p>

        <div className="mt-8 w-full sm:max-w-xs">
          <SnackAddButton product={product} size="lg" canPurchase={canPurchase} />
        </div>
      </div>
    </div>
  );
}
