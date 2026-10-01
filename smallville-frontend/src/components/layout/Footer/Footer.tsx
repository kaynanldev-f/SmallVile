"use client";

import Link from "next/link";
import Logo from "@/src/components/ui/Logo";

export default function Footer() {
  return (
    <footer className="mt-24 w-full border-t border-grayScale-600 bg-deep-black text-grayScale-200">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-5 py-10 sm:px-6 md:flex-row md:justify-between md:gap-12 md:py-12">
        <div className="flex justify-center md:justify-start">
          <Logo />
        </div>

        <div className="text-center md:text-left">
          <h3 className="mb-4 text-lg font-semibold sm:text-xl">Links</h3>

          <ul className="space-y-3">
            <li>
              <Link
                href="/em-cartaz"
                className="transition-colors hover:text-red-cinema"
              >
                Em cartaz
              </Link>
            </li>

            <li>
              <Link
                href="/lancamentos"
                className="transition-colors hover:text-red-cinema"
              >
                Lançamentos
              </Link>
            </li>

            <li>
              <Link
                href="/bomboniere"
                className="transition-colors hover:text-red-cinema"
              >
                Bomboniere
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-center md:text-left">
          <h3 className="mb-4 text-lg font-semibold sm:text-xl">Contatos</h3>

          <ul className="space-y-3 wrap-break-word">
            <li>(99) 9999-9999</li>
            <li>cineville@contato.com</li>
          </ul>
        </div>

        <div className="text-center md:text-left">
          <ul className="space-y-4">
            <li>
              <Link
                href="/"
                className="transition-colors hover:text-red-cinema"
              >
                Políticas de privacidade
              </Link>
            </li>

            <li>
              <Link
                href="/"
                className="transition-colors hover:text-red-cinema"
              >
                Termos de uso
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-red-cinema px-4 py-3">
        <p className="text-center text-xs sm:text-sm">
          © CineVille 2026 - Todos os direitos reservados
        </p>
      </div>
    </footer>
  );
}
