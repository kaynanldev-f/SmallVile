"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useLoginForm } from "@/src/hooks/useLoginForm";
import InputForm from "../ui/InputForm";
import Button from "../ui/Button";

const EyeIcon = ({ visible }: { visible: boolean }) => {
  const Icon = visible ? FiEye : FiEyeOff;

  return (
    <Icon
      size={20}
      className={`transition-opacity ${
        visible ? "opacity-100" : "opacity-60"
      } text-red-cinema hover:opacity-100`}
    />
  );
};

export default function Login() {
  // Feedback da exclusão de conta: a sessão já caiu quando o usuário chega
  // aqui, então a confirmação é dada nesta tela, e não na que ele deixou.
  const accountDeleted = useSearchParams().get("conta") === "excluida";

  const {
    formAction,
    isPending,
    state,
    showPassword,
    togglePassword,
    formValues,
    handleChange,
  } = useLoginForm();

  return (
    <form action={formAction} className="space-y-5">
      {accountDeleted && (
        <p
          role="status"
          className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-center text-sm text-green-400"
        >
          Sua conta foi excluída com sucesso.
        </p>
      )}

      {/* Email */}
      <div className="w-full">
        <label
          htmlFor="email"
          className="mb-2 block text-xs font-semibold tracking-wider text-grayScale-300"
        >
          E-mail
        </label>

        <InputForm
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="nome@exemplo.com"
          value={formValues.email || ""}
          onChange={handleChange}
          hasIcon={false}
        />
      </div>

      {/* Senha */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label
            htmlFor="password"
            className="text-xs font-semibold tracking-wider text-grayScale-300"
          >
            Senha
          </label>

          <Link
            href="/forgot-password"
            className="text-xs text-red-500 hover:underline"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <div className="relative">
          <InputForm
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="********"
            value={formValues.password || ""}
            onChange={handleChange}
            hasIcon={false}
          />

          <button
            type="button"
            onClick={togglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2"
          >
            <EyeIcon visible={showPassword} />
          </button>
        </div>
      </div>

      {/* Erro */}
      {state.error && (
        <p className="text-center text-sm font-semibold text-error">
          {state.error}
        </p>
      )}

      {/* Botão */}
      <Button
        type="submit"
        disabled={isPending}
        className="flex w-full items-center justify-center rounded-md bg-red-cinema py-3 font-semibold text-grayScale-200 transition hover:bg-red-cinema/ disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Entrando..." : "Entrar →"}
      </Button>

      {/* Cadastro */}
      <p className="text-center text-sm text-grayScale-300">
        Não tem uma conta?{" "}
        <Link
          href="/register"
          className="font-semibold text-red-cinema hover:underline"
        >
          Crie agora
        </Link>
      </p>
    </form>
  );
}
