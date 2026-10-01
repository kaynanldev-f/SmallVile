"use client";

import { Suspense } from "react";
import Login from "@/src/components/login";

import AuthLayout from "../AuthLayout";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Bem vindo ao Cineville"
      subtitle="Entre para acessar sua conta e continuar sua experiência."
    >
      {/* `Login` lê a query (`?conta=excluida`), o que exige a cerca de Suspense. */}
      <Suspense fallback={null}>
        <Login />
      </Suspense>
    </AuthLayout>
  );
}
