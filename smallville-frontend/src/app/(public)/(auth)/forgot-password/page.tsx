import ForgotPassword from "@/src/components/forgotPassword";

import AuthLayout from "../AuthLayout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe o e-mail cadastrado na plataforma. Enviaremos um link para você criar uma nova senha."
    >
      <ForgotPassword />
    </AuthLayout>
  );
}
