"use client";
import Register from "@/src/components/register";

import AuthLayout from "../AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Criar Conta"
      subtitle="Crie sua conta e garanta seu lugar na primeira fila."
      wide
    >
      <Register />
    </AuthLayout>
  );
}
