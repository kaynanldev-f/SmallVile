"use client";

import { useState } from "react";
import Person from "@mui/icons-material/Person";
import Diamond from "@mui/icons-material/Diamond";
import DashboardIcon from "@mui/icons-material/SpaceDashboard";
import { useAuth } from "@/src/context/AuthContext";
import Link from "next/link";
import LogoutButton from "../../ui/LogoutButton";
import AdminBadge from "../../admin/AdminBadge";
import NotificationBell from "../../notifications/NotificationBell";
import NotificationBellBoundary from "../../notifications/NotificationBellBoundary";

export default function HeaderUser() {
  const [open, setOpen] = useState(false);
  const { user, isAdmin } = useAuth();

  return (
    <>
      <div className="flex items-center gap-3 sm:gap-4">
        {/*
          O painel do sino é desenhado em um portal no `body` e se posiciona
          pela medida do ícone, então não depende de nenhuma âncora aqui — o
          que importa neste ponto é a cerca em volta, que impede uma falha das
          notificações de derrubar a Header.
        */}
        <div className="flex items-center">
          <NotificationBellBoundary>
            <NotificationBell />
          </NotificationBellBoundary>
        </div>

        <Link
          href="/points"
          className="flex items-center gap-2 text-white"
        >
          <Diamond className="text-[22px] sm:text-[26px] hover:text-blue-400 hover:scale-110 transition-all duration-500 cursor-pointer" />
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-white"
        >
          <Person className="text-[22px] sm:text-[26px] hover:opacity-80 transition-all duration-500 cursor-pointer" />
        </button>
      </div>

      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 bg-black/50 transition-opacity duration-300 z-40 ${
          open ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      />

      <aside
        className={`fixed top-0 right-0 h-screen w-full sm:w-80 md:w-96 bg-gray-surface shadow-xl z-50
        transform transition-all duration-300 ease-out
        ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="p-5 sm:p-6 h-full flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-bold text-lg sm:text-xl">Minha Conta</h2>

            <button
              onClick={() => setOpen(false)}
              className="text-xl sm:text-2xl hover:opacity-70 transition"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col items-center border-b border-b-grayScale-500 pb-6 mb-6">
            <Person className="w-14 h-14 sm:w-16 sm:h-16 text-grayScale-500" />

            <p className="font-bold text-base sm:text-lg mt-2 text-center wrap-break-word">
              {user?.name}
            </p>

            <p className="text-gray-500 text-xs sm:text-sm text-center break-all">
              {user?.email}
            </p>

            <AdminBadge className="mt-3" />
          </div>

          <nav className="flex flex-col gap-3 sm:gap-4 flex-1">
            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-lg border border-red-cinema/40 bg-red-cinema/10 px-3 py-2 text-base font-bold text-red-cinema transition-colors hover:bg-red-cinema/20"
              >
                <DashboardIcon className="text-[20px]" />
                Dashboard Admin
              </Link>
            )}

            <Link
              href="/perfil"
              onClick={() => setOpen(false)}
              className="py-2 text-base  transition-colors"
            >
              Meu Perfil
            </Link>

            <Link
              href="/notificacoes"
              onClick={() => setOpen(false)}
              className="py-2 text-base  transition-colors"
            >
              Notificações
            </Link>

            <Link
              href="/meus-pedidos"
              onClick={() => setOpen(false)}
              className="py-2 text-base  transition-colors"
            >
              Meus Pedidos
            </Link>

            <Link
              href="/meus-ingressos"
              onClick={() => setOpen(false)}
              className="py-2 text-base  transition-colors"
            >
              Meus Ingressos
            </Link>

            <Link
              href="/points"
              onClick={() => setOpen(false)}
              className="py-2 text-base  transition-colors"
            >
              Programa de Pontos
            </Link>

            <div className="mt-auto pt-6">
              <LogoutButton />
            </div>
          </nav>
        </div>
      </aside>
    </>
  );
}
