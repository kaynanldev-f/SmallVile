import Footer from "@/src/components/layout/Footer/Footer";
import PointsPage from "@/src/components/points/PointsPage";
import {
  getMyPointsBalance,
  getMyPointsTransactions,
} from "@/src/actions/pointsActions";
import { getServerUser } from "@/src/lib/auth";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";

export const metadata = {
  title: "Programa de Pontos | Cineville",
};

/** Saldo e extrato do usuário logado. */
export default async function PointsRoute({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  const [user, balance, transactions] = await Promise.all([
    getServerUser(),
    getMyPointsBalance(),
    getMyPointsTransactions(page, ADMIN_PAGE_SIZE),
  ]);

  const loadError = !balance.success
    ? balance.error
    : !transactions.success
      ? transactions.error
      : undefined;

  return (
    <>
      <PointsPage
        user={user ? { name: user.name, email: user.email } : undefined}
        balance={balance.success ? balance.data : undefined}
        transactions={transactions.success ? transactions.data : undefined}
        loadError={loadError}
      />

      <Footer />
    </>
  );
}
