"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, ShieldAlert } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { resetPassword } from "@/src/actions/resetPasswordActions";
import { ResetPasswordState } from "@/src/types/forgotPassword";
import { InferInput } from "valibot";
import { resetPasswordSchema } from "@/src/lib/schemas/resetPasswordSchema";
import InputForm from "../ui/InputForm";
import Button from "../ui/Button";

type ResetPasswordInput = InferInput<typeof resetPasswordSchema>;

const initialState: ResetPasswordState<Partial<ResetPasswordInput>> = {
  success: false,
  message: "",
  inputs: {
    token: "",
    password: "",
    confirmPassword: "",
  },
};

/** Tempo até o redirecionamento automático para o login, em milissegundos. */
const REDIRECT_DELAY = 2500;

/** Redefinição de senha a partir do link do e-mail. */
export default function ResetPassword() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token")?.trim() ?? "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [state, action, pending] = useActionState(resetPassword, initialState);

  useEffect(() => {
    if (state.success) {
      const timer = setTimeout(() => {
        router.push("/login");
      }, REDIRECT_DELAY);

      return () => clearTimeout(timer);
    }
  }, [state.success, router]);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 size={44} className="text-sucess" aria-hidden="true" />

        <p className="text-sm text-grayScale-200">
          {state.message || "Senha alterada com sucesso!"}
        </p>

        <p className="text-xs text-grayScale-400">
          Redirecionando para o login...
        </p>

        <Link href="/login" className="w-full">
          <Button type="button" className="w-full">
            Ir para o login agora
          </Button>
        </Link>
      </div>
    );
  }

  // Sem token no endereço não há o que enviar; o formulário nem aparece.
  if (!token) {
    return (
      <InvalidLink message="Este link de redefinição está incompleto ou já foi utilizado." />
    );
  }

  return (
    <>
      <form autoComplete="off" action={action} className="space-y-5">
        {/* O token do link, nunca exibido nem editável. */}
        <input type="hidden" name="token" value={token} />

        <div>
          <label
            htmlFor="new-password"
            className="mb-2 block text-xs font-semibold tracking-wider text-grayScale-300 uppercase"
          >
            Nova senha
          </label>

          <div className="flex items-center rounded-md border border-grayScale-600 bg-grayScale-700 pr-3">
            <InputForm
              id="new-password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="new-password"
              placeholder="Digite sua nova senha"
              hasIcon={true}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="cursor-pointer"
            >
              {showPassword ? (
                <EyeOff size={20} className="text-grayScale-400" />
              ) : (
                <Eye size={20} className="text-grayScale-400" />
              )}
            </button>
          </div>

          {state.errors?.password && (
            <p className="mt-1 text-xs text-red-cinema">
              {state.errors.password[0]}
            </p>
          )}

          <p className="mt-2 text-[11px] text-grayScale-400">
            De 6 a 10 caracteres, com letra maiúscula, minúscula, número e
            caractere especial.
          </p>
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-xs font-semibold tracking-wider text-grayScale-300 uppercase"
          >
            Confirmar nova senha
          </label>

          <div className="flex items-center rounded-md border border-grayScale-600 bg-grayScale-700 pr-3">
            <InputForm
              id="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              placeholder="Digite novamente sua nova senha"
              hasIcon={true}
            />

            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={
                showConfirmPassword ? "Ocultar senha" : "Mostrar senha"
              }
              className="cursor-pointer"
            >
              {showConfirmPassword ? (
                <EyeOff size={20} className="text-grayScale-400" />
              ) : (
                <Eye size={20} className="text-grayScale-400" />
              )}
            </button>
          </div>

          {state.errors?.confirmPassword && (
            <p className="mt-1 text-xs text-red-cinema">
              {state.errors.confirmPassword[0]}
            </p>
          )}
        </div>

        {state.message && !state.invalidToken && (
          <p role="alert" className="text-center text-sm text-error">
            {state.message}
          </p>
        )}

        {state.invalidToken && (
          <div
            role="alert"
            className="flex gap-3 rounded-md border border-red-cinema/40 bg-red-cinema/10 p-3"
          >
            <ShieldAlert
              size={20}
              className="mt-0.5 shrink-0 text-red-cinema"
              aria-hidden="true"
            />

            <div className="text-xs text-grayScale-300">
              <p className="font-bold text-grayScale-200">{state.message}</p>

              <p className="mt-1">
                O link vale por 1 hora e só pode ser usado uma vez.{" "}
                <Link
                  href="/forgot-password"
                  className="font-bold text-red-cinema underline"
                >
                  Solicitar um novo link
                </Link>
                .
              </p>
            </div>
          </div>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Redefinindo..." : "Redefinir senha"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-8 flex items-center justify-center gap-2 text-sm text-grayScale-400 transition hover:text-grayScale-200"
      >
        <ArrowLeft size={18} />
        Voltar para login
      </Link>
    </>
  );
}

/** Estado terminal do link: não há formulário a mostrar, só o caminho de volta. */
function InvalidLink({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <ShieldAlert size={44} className="text-red-cinema" aria-hidden="true" />

      <p className="text-sm text-grayScale-200">{message}</p>

      <p className="text-xs text-grayScale-400">
        Por segurança, o link de redefinição vale por 1 hora e só pode ser usado
        uma vez.
      </p>

      <Link href="/forgot-password" className="w-full">
        <Button type="button" className="w-full">
          Solicitar um novo link
        </Button>
      </Link>

      <Link
        href="/login"
        className="flex items-center justify-center gap-2 text-sm text-grayScale-400 transition hover:text-grayScale-200"
      >
        <ArrowLeft size={18} />
        Voltar para login
      </Link>
    </div>
  );
}
