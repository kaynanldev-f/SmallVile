import { UserProfile } from "@/src/actions/userActions";
import { isoToBrDateTime } from "@/src/utils/date";
import DeleteAccountButton from "./DeleteAccountButton";

/** Identificação da conta: nome, e-mail e data de cadastro, com a exclusão isolada. */
export default function AccountSummary({ profile }: { profile: UserProfile }) {
  const fullName = [profile.name, profile.surname].filter(Boolean).join(" ");
  // `createdAt` vem como instante ISO; a tela mostra só o dia, como o resto
  // do sistema.
  const memberSince =
    isoToBrDateTime(profile.createdAt)?.split(" ")[0] ?? "Não informada";

  const fields = [
    { label: "Nome", value: fullName || "—" },
    { label: "E-mail", value: profile.email || "—" },
    { label: "Data de cadastro", value: memberSince },
  ];

  return (
    <section className="rounded-xl border border-grayScale-600 bg-gray-surface">
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-3 lg:p-6">
        {fields.map((field) => (
          <div key={field.label} className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-bold text-grayScale-400 uppercase">
              {field.label}
            </span>

            <span className="truncate text-sm font-semibold text-grayScale-200" title={field.value}>
              {field.value}
            </span>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-grayScale-600 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6">
        <div className="min-w-0">
          <p className="text-sm font-bold text-red-cinema">Excluir minha conta</p>

          <p className="mt-0.5 text-xs text-grayScale-400">
            Remove seus dados de acesso. Esta ação não pode ser desfeita.
          </p>
        </div>

        <DeleteAccountButton />
      </div>
    </section>
  );
}
