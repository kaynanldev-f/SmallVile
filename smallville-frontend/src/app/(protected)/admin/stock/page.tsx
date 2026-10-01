import { listProducts } from "@/src/actions/admin/productAdminActions";
import StockManager from "@/src/components/admin/stock/StockManager";

export default async function AdminStockPage() {
  const result = await listProducts();

  return (
    <StockManager
      products={result.success ? result.data : []}
      loadError={result.success ? undefined : result.error}
    />
  );
}
