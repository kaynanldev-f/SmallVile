import Footer from "@/src/components/layout/Footer/Footer";
import ProfileForm from "@/src/components/profile/ProfileForm";
import AccountSummary from "@/src/components/profile/AccountSummary";
import { getMyProfile } from "@/src/actions/userActions";

export default async function PerfilPage() {
  const result = await getMyProfile();

  return (
    // `overflow-x-hidden` fecha a barra horizontal: conteúdo longo quebra em vez
    // de empurrar a página.
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-deep-black pt-16 text-grayScale-200">
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="mb-6 text-2xl font-black sm:text-3xl">Meu Perfil</h1>

        {result.success ? (
          <div className="flex flex-col gap-6">
            <AccountSummary profile={result.data} />

            <ProfileForm profile={result.data} />
          </div>
        ) : (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {result.error}
          </p>
        )}
      </div>

      <Footer />
    </div>
  );
}
