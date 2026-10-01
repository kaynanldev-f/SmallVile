import { listUsers } from "@/src/actions/admin/usersActions";
import UsersManager from "@/src/components/admin/users/UsersManager";
import { ADMIN_PAGE_SIZE, parsePageParam } from "@/src/utils/pagination";

export const metadata = {
  title: "Usuários | Admin Cineville",
};

/** Usuários cadastrados. */
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = parsePageParam(pageParam);

  const result = await listUsers(page, ADMIN_PAGE_SIZE);

  return (
    <section className="flex flex-col gap-6">
      <header>
        <h2 className="text-xl font-black">Usuários</h2>

        <p className="mt-1 text-sm text-grayScale-400">
          Clientes cadastrados no Cineville, com contato e data de cadastro.
          Contas de administrador não aparecem aqui — o backend as remove da
          listagem.
        </p>
      </header>

      {!result.success ? (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {result.error}
        </p>
      ) : (
        <UsersManager
          users={result.data.items}
          page={result.data.page}
          limit={result.data.limit}
          total={result.data.total}
        />
      )}
    </section>
  );
}
