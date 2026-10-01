"use client";

import Link from "next/link";
import { ArrowLeft, Mail, MailCheck } from "lucide-react";
import { useActionState } from "react";
import { forgotPassword } from "@/src/actions/forgotPasswordActions";
import Button from "@/src/components/ui/Button";
import InputForm from "../ui/InputForm";

const initialState = {
  success: false,
  message: "",
  inputs: {
    email: "",
  },
};

/** Pedido de recuperação de senha. */
export default function ForgotPassword() {
  const [state, action, pending] = useActionState(forgotPassword, initialState);

  if (state.success) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <MailCheck size={44} className="text-sucess" aria-hidden="true" />

        <p className="text-sm text-grayScale-200">
          {state.message || "Um link de recuperação foi enviado."}
        </p>

        <p className="text-xs text-grayScale-400">
          Abra o e-mail e clique em <strong>Redefinir minha senha</strong>. O
          link vale por 1 hora e só pode ser usado uma vez. Se não encontrar a
          mensagem, verifique a caixa de spam.
        </p>

        <Link
          href="/login"
          className="mt-2 flex items-center justify-center gap-2 text-sm text-grayScale-400 transition hover:text-grayScale-200"
        >
          <ArrowLeft size={16} />
          Voltar para login
        </Link>
      </div>
    );
  }

  return (
    <>
      <form action={action} className="mt-8 space-y-6">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium tracking-wide text-grayScale-400 uppercase"
          >
            E-mail
          </label>

          <div className="flex items-center rounded-md border border-grayScale-600 bg-grayScale-700 px-3 transition-all focus:border-red-cinema">
            <Mail size={18} className="text-red-cinema" />

            <InputForm
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              defaultValue={state.inputs?.email}
              placeholder="nome@exemplo.com"
              hasIcon={true}
            />
          </div>

          {state.errors?.email && (
            <span className="mt-1 block text-xs text-red-cinema">
              {state.errors.email[0]}
            </span>
          )}
        </div>

        {state.message && (
          <p role="alert" className="text-center text-sm text-error">
            {state.message}
          </p>
        )}

        <Button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-red-cinema py-3 font-semibold text-grayScale-200 transition hover:bg-red-cinema disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar link"}
        </Button>
      </form>

      <Link
        href="/login"
        className="mt-6 flex items-center justify-center gap-2 text-sm text-grayScale-400 transition hover:text-grayScale-200"
      >
        <ArrowLeft size={16} />
        Voltar para login
      </Link>
    </>
  );
}
