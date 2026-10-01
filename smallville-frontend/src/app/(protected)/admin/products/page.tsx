import { listProducts } from "@/src/actions/admin/productAdminActions";
import ProductsManager from "@/src/components/admin/products/ProductsManager";

export default async function AdminProductsPage() {
  const result = await listProducts();

  return (
    <ProductsManager
      products={result.success ? result.data : []}
      loadError={result.success ? undefined : result.error}
    />
  );
}
