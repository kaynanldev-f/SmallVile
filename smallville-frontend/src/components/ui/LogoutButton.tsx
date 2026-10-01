"use client";

import { useState } from "react";
import { logoutAction } from "@/src/actions/authAction";
import LogoutIcon from "@mui/icons-material/Logout";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import { ConfirmModal } from "@/src/components/ui/ConfirmModal";

export default function LogoutButton({
  customClass = "-z-5",
}: {
  customClass?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleConfirmLogout = async () => {
    setIsPending(true);
    await logoutAction();
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`flex items-center gap-2 text-red-cinema hover:text-red-cinema/80 rounded-full font-medium font-inter transition-colors cursor-pointer ${customClass}`}
      >
        <LogoutIcon />
        <span className="leading-none">Sair</span>
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        title="Deseja realmente sair da conta?"
        message="Você precisará entrar novamente para acessar seus pedidos, ingressos e pontos."
        onCancel={() => setIsModalOpen(false)}
        onConfirm={handleConfirmLogout}
        isPending={isPending}
        icon={<LogoutRoundedIcon sx={{ fontSize: 40 }} />}
        confirmButtonText={isPending ? "Saindo..." : "Sim, sair"}
        cancelButtonText="Cancelar"
      />
    </>
  );
}
