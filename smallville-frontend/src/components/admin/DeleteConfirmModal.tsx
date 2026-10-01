"use client";

import AdminModal from "./AdminModal";
import Button from "../ui/Button";

interface DeleteConfirmModalProps {
  open: boolean;
  itemName: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function DeleteConfirmModal({
  open,
  itemName,
  loading,
  onConfirm,
  onClose,
}: DeleteConfirmModalProps) {
  return (
    <AdminModal
      open={open}
      title="Confirmar remoção"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>

          <Button
            onClick={onConfirm}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            {loading ? "Removendo..." : "Remover"}
          </Button>
        </>
      }
    >
      <p className="text-sm">
        Tem certeza que deseja remover{" "}
        <span className="font-bold text-white">{itemName}</span>? Essa ação não
        pode ser desfeita.
      </p>
    </AdminModal>
  );
}
