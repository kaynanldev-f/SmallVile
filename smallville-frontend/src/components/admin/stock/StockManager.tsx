"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStock } from "@/src/actions/admin/productAdminActions";
import { AdminProduct } from "@/src/types/admin";
import AdminTable from "../AdminTable";
import Button from "../../ui/Button";
import { adminInputClass } from "../AdminField";

/** Abaixo disso o item aparece destacado como estoque baixo. */
const LOW_STOCK_THRESHOLD = 10;

interface Props {
  products: AdminProduct[];
  loadError?: string;
}

export default function StockManager({ products, loadError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Quantidades em edição, por id de produto.
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(loadError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  const lowStock = useMemo(
    () => products.filter((p) => p.quantity < LOW_STOCK_THRESHOLD),
    [products],
  );

  function save(product: AdminProduct) {
    const raw = drafts[product._id];

    if (raw === undefined) return;

    const quantity = Number(raw);

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("A quantidade deve ser um número inteiro igual ou maior que 0.");
      return;
    }

    setError(null);
    setSavingId(product._id);

    startTransition(async () => {
      const result = await updateStock(product._id, quantity);

      setSavingId(null);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setDrafts((current) => {
        const next = { ...current };
        delete next[product._id];
        return next;
      });

      setSuccess(`Estoque de ${product.name} atualizado.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-black">Estoque</h2>

        <p className="mt-1 text-xs text-grayScale-400">
          Quantidade física disponível de cada produto da bomboniere.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          onClick={() => setError(null)}
          className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          onClick={() => setSuccess(null)}
          className="cursor-pointer rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400"
        >
          {success}
        </p>
      )}

      {lowStock.length > 0 && (
        <p className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
          {lowStock.length === 1
            ? "1 produto com estoque abaixo de "
            : `${lowStock.length} produtos com estoque abaixo de `}
          {LOW_STOCK_THRESHOLD} unidades.
        </p>
      )}

      <AdminTable
        rows={products}
        rowKey={(product) => product._id}
        emptyMessage="Nenhum produto cadastrado ainda."
        columns={[
          {
            header: "Produto",
            render: (product) => (
              <span className="font-bold text-white">{product.name}</span>
            ),
          },
          { header: "Categoria", render: (product) => product.category },
          {
            header: "Estoque atual",
            render: (product) => (
              <span
                className={
                  product.quantity < LOW_STOCK_THRESHOLD
                    ? "font-bold text-yellow-400"
                    : ""
                }
              >
                {product.quantity}
              </span>
            ),
          },
          {
            header: "Ajustar",
            render: (product) => {
              const draft = drafts[product._id] ?? String(product.quantity);
              const changed = draft !== String(product.quantity);

              return (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    value={draft}
                    aria-label={`Estoque de ${product.name}`}
                    onChange={(e) =>
                      setDrafts({ ...drafts, [product._id]: e.target.value })
                    }
                    className={`${adminInputClass} w-24 py-1`}
                  />

                  <Button
                    onClick={() => save(product)}
                    disabled={!changed || isPending}
                    className="px-3 py-1 text-xs"
                  >
                    {savingId === product._id ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              );
            },
          },
        ]}
      />
    </div>
  );
}
