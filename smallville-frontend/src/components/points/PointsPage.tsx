import Link from "next/link";
import StarsOutlinedIcon from "@mui/icons-material/StarsOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import RedeemOutlinedIcon from "@mui/icons-material/RedeemOutlined";
import EmojiEventsOutlinedIcon from "@mui/icons-material/EmojiEventsOutlined";
import {
  PointsBalance,
  PointsTransaction,
  PointsTransactionsPage,
  POINTS_TRANSACTION_LABELS,
  UPCOMING_REWARDS,
} from "@/src/types/points";
import { formatCents } from "@/src/utils/currency";
import { formatFullDateTime } from "@/src/utils/relative-time";
import AdminPagination from "../admin/AdminPagination";

interface Props {
  user?: { name?: string; email?: string };
  balance?: PointsBalance;
  transactions?: PointsTransactionsPage;
  loadError?: string;
}

/** Área de pontos do usuário. */
export default function PointsPage({
  user,
  balance,
  transactions,
  loadError,
}: Props) {
  const rule = balance?.rule;

  const ruleText = rule
    ? `${rule.points} pontos a cada ${formatCents(rule.amountInCents)} gastos.`
    : null;

  const items = transactions?.items ?? [];

  return (
    <main className="bg-deep-black text-grayScale-200 min-h-screen pt-16">
      <div className="mx-auto w-full max-w-5xl px-4 py-10 md:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-black md:text-3xl">
            Programa de Pontos ClubVille
          </h1>

          <p className="mt-1 text-sm text-grayScale-400">
            Você acumula pontos automaticamente a cada compra aprovada.
          </p>
        </header>

        {loadError && (
          <p
            role="alert"
            className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
          >
            {loadError}
          </p>
        )}

        {/* ===================== SALDO ===================== */}

        <section className="rounded-xl border border-grayScale-600 bg-gray-surface">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr]">
            <div className="border-b border-grayScale-600 p-6 lg:border-b-0 lg:border-r">
              <p className="text-[11px] font-bold tracking-widest text-red-cinema uppercase">
                ClubVille
              </p>

              <h2 className="mt-2 text-xl font-black">
                Olá, {user?.name ?? "cliente"}!
              </h2>

              {user?.email && (
                <p className="mt-1 text-sm break-all text-grayScale-400">
                  {user.email}
                </p>
              )}

              {ruleText && (
                <div className="mt-6 flex gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-alert/70">
                    <StarsOutlinedIcon sx={{ fontSize: 16, color: "#e5bd22" }} />
                  </span>

                  <div>
                    <p className="text-sm font-bold text-grayScale-200">
                      Você ganha
                    </p>

                    <p className="text-sm text-grayScale-400">{ruleText}</p>
                  </div>
                </div>
              )}

              {balance && (
                <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-grayScale-600 pt-4">
                  <div>
                    <dt className="text-[11px] text-grayScale-400 uppercase">
                      Total acumulado
                    </dt>

                    <dd className="mt-1 text-lg font-black">
                      {balance.totalEarned.toLocaleString("pt-BR")}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-[11px] text-grayScale-400 uppercase">
                      Total resgatado
                    </dt>

                    <dd className="mt-1 text-lg font-black">
                      {balance.totalRedeemed.toLocaleString("pt-BR")}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="flex flex-col items-center justify-center p-6 text-center">
              <span className="text-[11px] text-grayScale-400 uppercase">
                Seu saldo
              </span>

              <strong className="mt-1 text-5xl font-black text-red-cinema">
                {(balance?.balance ?? 0).toLocaleString("pt-BR")}
              </strong>

              <span className="text-sm text-red-cinema">pontos</span>

              {!balance && !loadError && (
                <p className="mt-3 text-xs text-grayScale-400">
                  Saldo indisponível no momento.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ===================== RESGATE (EM BREVE) ===================== */}

        <section className="mt-6 rounded-xl border border-grayScale-600 bg-gray-surface p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <RedeemOutlinedIcon sx={{ fontSize: 20, color: "#e50914" }} />
            Em breve
          </h2>

          <p className="mt-1 text-sm text-grayScale-400">
            O resgate de pontos ainda não está disponível. Continue acumulando —
            seus pontos ficam guardados na sua conta.
          </p>

          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {UPCOMING_REWARDS.map((reward) => (
              <li
                key={reward.label}
                className="flex items-center justify-between gap-3 rounded-lg border border-grayScale-600 bg-deep-black p-4 opacity-70"
              >
                <span className="flex items-center gap-2 text-sm font-bold">
                  <span aria-hidden="true">{reward.icon}</span>
                  {reward.label}
                </span>

                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  title="Funcionalidade em desenvolvimento"
                  className="cursor-not-allowed rounded border border-grayScale-600 px-2.5 py-1 text-[10px] font-black tracking-wide text-grayScale-400 uppercase"
                >
                  Em breve
                </button>
              </li>
            ))}
          </ul>
        </section>

        {/* ===================== EXTRATO ===================== */}

        <section className="mt-6 rounded-xl border border-grayScale-600 bg-gray-surface p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <HistoryOutlinedIcon sx={{ fontSize: 20, color: "#e50914" }} />
            Extrato de pontos
          </h2>

          {items.length === 0 ? (
            <p className="mt-4 rounded-lg border border-grayScale-600 bg-deep-black px-4 py-8 text-center text-sm text-grayScale-400">
              Nenhum lançamento ainda. Os pontos entram aqui quando o pagamento
              de uma compra é aprovado.
            </p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-2xl text-left text-sm">
                  <thead className="border-b border-grayScale-600 text-xs text-grayScale-400 uppercase">
                    <tr>
                      <th className="px-3 py-2 font-bold">Data</th>
                      <th className="px-3 py-2 font-bold">Tipo</th>
                      <th className="px-3 py-2 font-bold">Origem</th>
                      <th className="px-3 py-2 font-bold">Valor da compra</th>
                      <th className="px-3 py-2 font-bold">Pontos</th>
                      <th className="px-3 py-2 font-bold">Saldo</th>
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item) => (
                      <TransactionRow key={item.id} item={item} />
                    ))}
                  </tbody>
                </table>
              </div>

              {transactions && (
                <div className="mt-4">
                  <AdminPagination
                    page={transactions.page}
                    limit={transactions.limit}
                    total={transactions.total}
                    itemLabel="lançamentos"
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* ===================== REGRAS ===================== */}

        <section className="mt-6 rounded-xl border border-grayScale-600 bg-gray-surface p-6">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <EmojiEventsOutlinedIcon sx={{ fontSize: 20, color: "#e5bd22" }} />
            Como funciona
          </h2>

          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-grayScale-400">
            {ruleText && <li>✓ {ruleText}</li>}

            <li>
              ✓ Os pontos entram apenas quando o pagamento do pedido é aprovado.
            </li>

            <li>✓ Pedidos pendentes ou recusados não geram pontos.</li>

            <li>✓ Os pontos não expiram.</li>

            <li>✓ O resgate de pontos será liberado em breve.</li>
          </ul>

          <p className="mt-4 text-xs text-grayScale-400">
            Acompanhe suas compras em{" "}
            <Link href="/meus-pedidos" className="font-bold text-red-cinema">
              Meus Pedidos
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}

function TransactionRow({ item }: { item: PointsTransaction }) {
  const positive = item.points >= 0;

  return (
    <tr className="border-b border-grayScale-600/50 last:border-0">
      <td className="px-3 py-3 text-grayScale-400">
        {formatFullDateTime(item.createdAt)}
      </td>

      <td className="px-3 py-3 font-medium">
        {POINTS_TRANSACTION_LABELS[item.type] ?? item.type}
      </td>

      <td className="px-3 py-3 text-grayScale-400">{item.description}</td>

      <td className="px-3 py-3 text-grayScale-400">
        {item.amountInCents !== undefined
          ? formatCents(item.amountInCents)
          : "—"}
      </td>

      <td
        className={`px-3 py-3 font-bold ${positive ? "text-sucess" : "text-error"}`}
      >
        {positive ? "+" : ""}
        {item.points}
      </td>

      <td className="px-3 py-3 text-grayScale-400">{item.balanceAfter}</td>
    </tr>
  );
}
