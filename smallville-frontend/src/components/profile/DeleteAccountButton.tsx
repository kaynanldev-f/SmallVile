"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DeleteForeverRounded from "@mui/icons-material/DeleteForeverRounded";
import { deleteMyAccount } from "@/src/actions/userActions";
import { useAuth } from "@/src/context/AuthContext";
import { ConfirmModal } from "@/src/components/ui/ConfirmModal";

/** Exclusão da própria conta, com confirmação obrigatória. */
export default function DeleteAccountButton() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  async function handleConfirm() {
    if (isDeleting) return;

    setIsDeleting(true);
    setError(null);

    const result = await deleteMyAccount();

    if (!result.success) {
      setError(result.error);
      setIsDeleting(false);
      setIsOpen(false);
      return;
    }

    // A action já apagou o cookie; aqui limpamos o usuário do contexto para
    // que o header não continue mostrando uma sessão que não existe mais.
    setUser(null);
    setDeleted(true);

    router.replace("/login?conta=excluida");
    router.refresh();
  }

  function handleCancel() {
    if (isDeleting) return;

    setIsOpen(false);
  }

  return (
    <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isDeleting || deleted}
        className="flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-red-cinema/50 bg-red-cinema/10 px-4 py-2 text-sm font-bold text-red-cinema transition-colors hover:bg-red-cinema hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        <DeleteForeverRounded sx={{ fontSize: 18 }} />
        Excluir conta
      </button>

      <ConfirmModal
        isOpen={isOpen}
        title="Excluir conta?"
        message="Tem certeza que deseja excluir sua conta? Essa ação não poderá ser desfeita e você perderá o acesso aos seus pedidos, ingressos e pontos."
        onCancel={handleCancel}
        onConfirm={handleConfirm}
        isPending={isDeleting}
        icon={<DeleteForeverRounded sx={{ fontSize: 40 }} />}
        confirmButtonText={isDeleting ? "Excluindo..." : "Excluir conta"}
        cancelButtonText="Cancelar"
      />
    </div>
  );
}
