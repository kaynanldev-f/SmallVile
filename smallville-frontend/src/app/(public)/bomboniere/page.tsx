import Link from "next/link";
import { getBomboniereCatalog } from "@/src/actions/catalogActions";
import { getServerUser } from "@/src/lib/auth";
import { PRODUCT_CATEGORIES, ProductCategory } from "@/src/types/admin";
import CatalogPage from "@/src/components/catalog/CatalogPage";
import BomboniereProductCard from "@/src/components/catalog/BomboniereProductCard";

export const metadata = {
  title: "Bomboniere | Cineville",
};

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  COMBOS: "Combos",
  COMIDAS: "Comidas",
  BEBIDAS: "Bebidas",
};

/** Combos primeiro: é o que o cinema quer destacar. */
const CATEGORY_ORDER: ProductCategory[] = ["COMBOS", "COMIDAS", "BEBIDAS"];

export default async function BombonierePage() {
  const user = await getServerUser();
  const result = await getBomboniereCatalog();

  // O catálogo é público: sem conta o visitante vê imagem, nome, tamanho,
  // preço e disponibilidade. A conta só é exigida para comprar.
  return (
    <CatalogPage
      title="Bomboniere"
      subtitle="Tudo o que temos à venda nos nossos cinemas. Os itens são adicionados ao pedido na hora de comprar o ingresso."
    >
      {!result.success ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {result.error}
        </p>
      ) : (
        <div className="flex flex-col gap-14">
          {!user && (
            <p className="rounded-lg border border-red-cinema/40 bg-red-cinema/10 px-4 py-3 text-sm text-grayScale-300">
              Você está vendo o catálogo como visitante.{" "}
              <Link
                href="/login"
                className="font-bold text-red-cinema underline underline-offset-2 hover:text-white"
              >
                Entre na sua conta
              </Link>{" "}
              para adicionar estes itens ao seu pedido.
            </p>
          )}

          {CATEGORY_ORDER.map((category) => {
            const products = result.data?.[category] ?? [];

            if (!products.length) return null;

            return (
              <section key={category}>
                <h2 className="mb-6 text-2xl font-black">
                  {CATEGORY_LABELS[category]}
                </h2>

                <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((product) => (
                    <BomboniereProductCard
                      key={product._id}
                      product={product}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          {PRODUCT_CATEGORIES.every(
            (category) => !(result.data?.[category] ?? []).length,
          ) && (
            <p className="rounded-xl border border-grayScale-600 bg-gray-surface px-6 py-12 text-center text-sm text-grayScale-400">
              Nenhum produto disponível no momento.
            </p>
          )}
        </div>
      )}
    </CatalogPage>
  );
}
