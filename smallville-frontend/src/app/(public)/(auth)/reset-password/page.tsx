import AuthLayout from "../AuthLayout";
import ResetPassword from "@/src/components/resetPassword";

export const metadata = {
  title: "Redefinir senha | Cineville",
};

/** Destino do botão do e-mail: `/reset-password?token=...`. */
export default function ResetPasswordPage() {
  return (
    <AuthLayout
      title="Redefinir senha"
      subtitle="Crie uma nova senha para acessar sua conta."
    >
      <ResetPassword />
    </AuthLayout>
  );
}
