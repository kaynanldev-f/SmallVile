"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/src/actions/admin/productAdminActions";
import {
  AdminProduct,
  PRODUCT_CATEGORIES,
  PRODUCT_SIZES,
  ProductCategory,
  ProductSize,
} from "@/src/types/admin";
import { centsToInput, formatCents, inputToCents } from "@/src/utils/currency";
import { validateImageUpload } from "@/src/utils/upload";
import AdminCrudShell from "../AdminCrudShell";
import AdminTable from "../AdminTable";
import AdminModal from "../AdminModal";
import AdminField, { adminInputClass } from "../AdminField";
import DeleteConfirmModal from "../DeleteConfirmModal";
import Button from "../../ui/Button";

interface FormState {
  name: string;
  category: ProductCategory;
  size: ProductSize | "";
  maxLimit: string;
  quantity: string;
  /** Em reais, como o admin digita. */
  price: string;
  isAvailable: boolean;
}

const EMPTY_FORM: FormState = {
  name: "",
  category: "COMIDAS",
  size: "",
  maxLimit: "6",
  quantity: "0",
  price: "",
  isAvailable: true,
};

interface Props {
  products: AdminProduct[];
  loadError?: string;
}

export default function ProductsManager({ products, loadError }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminProduct | null>(null);

  const [error, setError] = useState<string | null>(loadError ?? null);
  const [success, setSuccess] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    if (imageInputRef.current) imageInputRef.current.value = "";
    setFormOpen(true);
  }

  function openEdit(product: AdminProduct) {
    setEditing(product);
    setForm({
      name: product.name,
      category: product.category,
      size: product.size ?? "",
      maxLimit: String(product.maxLimit),
      quantity: String(product.quantity),
      price: centsToInput(product.price),
      isAvailable: product.isAvailable,
    });
    if (imageInputRef.current) imageInputRef.current.value = "";
    setFormOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Informe o nome do produto.");
      return;
    }

    const price = inputToCents(form.price);

    if (price === null) {
      setError("Informe um preço válido (ex.: 15,00).");
      return;
    }

    const maxLimit = Number(form.maxLimit);
    const quantity = Number(form.quantity);

    if (!Number.isInteger(maxLimit) || maxLimit < 1) {
      setError("O limite por pedido deve ser 1 ou mais.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      setError("A quantidade em estoque deve ser 0 ou mais.");
      return;
    }

    const image = imageInputRef.current?.files?.[0] ?? null;
    const imageError = validateImageUpload([image]);

    if (imageError) {
      setError(imageError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      category: form.category,
      size: form.size || undefined,
      maxLimit,
      quantity,
      price,
      isAvailable: form.isAvailable,
    };

    setError(null);

    startTransition(async () => {
      const result = editing
        ? await updateProduct(editing._id, payload, image)
        : await createProduct(payload, image);

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSuccess(editing ? "Produto atualizado." : "Produto cadastrado.");
      setFormOpen(false);
      router.refresh();
    });
  }

  function handleDelete() {
    if (!deleting) return;

    startTransition(async () => {
      const result = await deleteProduct(deleting._id);

      if (!result.success) {
        setError(result.error);
        setDeleting(null);
        return;
      }

      setSuccess("Produto removido.");
      setDeleting(null);
      router.refresh();
    });
  }

  return (
    <AdminCrudShell
      title="Produtos"
      description="Itens da bomboniere, preço e disponibilidade."
      createLabel="Novo produto"
      onCreate={openCreate}
      error={error}
      success={success}
      onDismiss={() => {
        setError(null);
        setSuccess(null);
      }}
    >
      <AdminTable
        rows={products}
        rowKey={(product) => product._id}
        emptyMessage="Nenhum produto cadastrado ainda."
        onEdit={openEdit}
        onDelete={setDeleting}
        columns={[
          {
            header: "Produto",
            render: (product) => (
              <div className="flex items-center gap-3">
                {product.imageUrl && (
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={36}
                    height={36}
                    unoptimized
                    className="h-9 w-9 rounded object-cover"
                  />
                )}

                <span className="font-bold text-white">{product.name}</span>
              </div>
            ),
          },
          { header: "Categoria", render: (product) => product.category },
          { header: "Tamanho", render: (product) => product.size ?? "—" },
          { header: "Preço", render: (product) => formatCents(product.price) },
          { header: "Estoque", render: (product) => product.quantity },
          {
            header: "Disponível",
            render: (product) => (
              <span
                className={
                  product.isAvailable ? "text-green-400" : "text-grayScale-400"
                }
              >
                {product.isAvailable ? "Sim" : "Não"}
              </span>
            ),
          },
        ]}
      />

      <AdminModal
        open={formOpen}
        title={editing ? "Editar produto" : "Novo produto"}
        onClose={() => setFormOpen(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>

            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AdminField
            label="Nome"
            htmlFor="product-name"
            className="sm:col-span-2"
          >
            <input
              id="product-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={adminInputClass}
              placeholder="Pipoca Salgada"
            />
          </AdminField>

          <AdminField label="Categoria" htmlFor="product-category">
            <select
              id="product-category"
              value={form.category}
              onChange={(e) =>
                setForm({
                  ...form,
                  category: e.target.value as ProductCategory,
                })
              }
              className={adminInputClass}
            >
              {PRODUCT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField label="Tamanho" htmlFor="product-size">
            <select
              id="product-size"
              value={form.size}
              onChange={(e) =>
                setForm({ ...form, size: e.target.value as ProductSize | "" })
              }
              className={adminInputClass}
            >
              <option value="">Sem tamanho</option>

              {PRODUCT_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </AdminField>

          <AdminField
            label="Preço"
            htmlFor="product-price"
            hint="Em reais. Enviado em centavos."
          >
            <input
              id="product-price"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              className={adminInputClass}
              placeholder="15,00"
              inputMode="decimal"
            />
          </AdminField>

          <AdminField label="Limite por pedido" htmlFor="product-max">
            <input
              id="product-max"
              type="number"
              min={1}
              value={form.maxLimit}
              onChange={(e) => setForm({ ...form, maxLimit: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField label="Quantidade em estoque" htmlFor="product-quantity">
            <input
              id="product-quantity"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className={adminInputClass}
            />
          </AdminField>

          <AdminField
            label="Imagem"
            htmlFor="product-image"
            hint={
              editing
                ? "Deixe vazio para manter a imagem atual."
                : "Obrigatória no cadastro."
            }
          >
            <input
              id="product-image"
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className={`${adminInputClass} file:mr-3 file:rounded file:border-0 file:bg-grayScale-600 file:px-3 file:py-1 file:text-xs file:text-white`}
            />
          </AdminField>

          <AdminField label="Disponível na bomboniere" htmlFor="product-avail">
            <select
              id="product-avail"
              value={form.isAvailable ? "true" : "false"}
              onChange={(e) =>
                setForm({ ...form, isAvailable: e.target.value === "true" })
              }
              className={adminInputClass}
            >
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          </AdminField>
        </div>
      </AdminModal>

      <DeleteConfirmModal
        open={!!deleting}
        itemName={deleting?.name ?? ""}
        loading={isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </AdminCrudShell>
  );
}
