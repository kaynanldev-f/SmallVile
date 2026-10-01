import Link from "next/link";
import HeadingContent from "@/src/components/ui/HeadingContent";
import HomeBomboniereCard from "./HomeBomboniereCard";
import PromoCandy from "./PromoCandy";
import { getBomboniereCatalog } from "@/src/actions/catalogActions";
import { getServerUser } from "@/src/lib/auth";
import { PRODUCT_CATEGORIES, CatalogProduct } from "@/src/types/admin";

/** Quantos produtos a Home mostra antes de mandar para o catálogo completo. */
const HOME_PRODUCTS_LIMIT = 8;

/** Bomboniere na Home, com os produtos reais cadastrados no backend. */
function pickHighlights(
  catalog: Partial<Record<string, CatalogProduct[]>>,
): CatalogProduct[] {
  const queues = PRODUCT_CATEGORIES.map((category) => [
    ...(catalog[category] ?? []),
  ]);

  const highlights: CatalogProduct[] = [];

  while (
    highlights.length < HOME_PRODUCTS_LIMIT &&
    queues.some((queue) => queue.length)
  ) {
    for (const queue of queues) {
      const product = queue.shift();

      if (product) highlights.push(product);

      if (highlights.length === HOME_PRODUCTS_LIMIT) break;
    }
  }

  return highlights;
}

export default async function HomeBomboniere() {
  const user = await getServerUser();

  // A vitrine é pública. O que a conta habilita é a COMPRA: `canPurchase`
  // desce até `SnackAddButton`, que troca o controle de quantidade pelo
  // convite ao login.
  const result = await getBomboniereCatalog();
  const catalog = result.success ? result.data : undefined;
  const canPurchase = !!user;

  // Destaque: primeiro combo disponível. Sem combos cadastrados, a Home
  // simplesmente não mostra o banner — em vez de inventar uma oferta.
  const featured = catalog?.COMBOS?.find(
    (product) => product.isAvailable && product.quantity > 0,
  );

  const highlights = catalog
    ? pickHighlights(catalog).filter((product) => product._id !== featured?._id)
    : [];

  return (
    <section
      id="bomboniere"
      className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <HeadingContent title="Bomboniere" />

        <Link
          href="/bomboniere"
          className="text-sm font-bold text-grayScale-400 transition-colors hover:text-red-cinema"
        >
          Ver todos
        </Link>
      </div>

      <p className="mt-4 max-w-2xl text-sm text-grayScale-400">
        Separe a pipoca antes de escolher a poltrona: o que você marcar aqui já
        aparece no carrinho quando finalizar a compra do ingresso.
      </p>

      {!result.success ? (
        <p className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {result.error}
        </p>
      ) : !highlights.length && !featured ? (
        <p className="mt-8 rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-12 text-center text-sm text-grayScale-400">
          Nenhum produto disponível no momento.
        </p>
      ) : (
        <>
          {!canPurchase && (
            <p className="mt-6 rounded-lg border border-red-cinema/40 bg-red-cinema/10 px-4 py-3 text-sm text-grayScale-300">
              Você pode ver todos os produtos por aqui.{" "}
              <Link
                href="/login"
                className="font-bold text-red-cinema underline underline-offset-2 hover:text-white"
              >
                Entre na sua conta
              </Link>{" "}
              para separar os itens e finalizar a compra.
            </p>
          )}

          {featured && (
            <PromoCandy product={featured} canPurchase={canPurchase} />
          )}

          {!!highlights.length && (
            <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {highlights.map((product) => (
                <HomeBomboniereCard
                  key={product._id}
                  product={product}
                  canPurchase={canPurchase}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
