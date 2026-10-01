"use client";

import AddIcon from "@mui/icons-material/Add";
import Button from "../ui/Button";

interface AdminCrudShellProps {
  title: string;
  description?: string;
  createLabel: string;
  onCreate: () => void;
  error?: string | null;
  success?: string | null;
  onDismiss?: () => void;
  children: React.ReactNode;
}

/** Cabeçalho + faixa de feedback compartilhados pelas telas de CRUD do admin. */
export default function AdminCrudShell({
  title,
  description,
  createLabel,
  onCreate,
  error,
  success,
  onDismiss,
  children,
}: AdminCrudShellProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">{title}</h2>

          {description && (
            <p className="mt-1 text-xs text-grayScale-400">{description}</p>
          )}
        </div>

        <Button onClick={onCreate} className="gap-1">
          <AddIcon className="text-[18px]" />
          {createLabel}
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          onClick={onDismiss}
          className="cursor-pointer rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          onClick={onDismiss}
          className="cursor-pointer rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-400"
        >
          {success}
        </p>
      )}

      {children}
    </div>
  );
}
