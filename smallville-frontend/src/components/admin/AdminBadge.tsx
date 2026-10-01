"use client";

import clsx from "clsx";
import ShieldIcon from "@mui/icons-material/AdminPanelSettings";
import { useAuth } from "@/src/context/AuthContext";

interface AdminBadgeProps {
  /** Renderiza sem depender do contexto (ex.: dentro do dashboard). */
  force?: boolean;
  className?: string;
}

export default function AdminBadge({ force, className }: AdminBadgeProps) {
  const { isAdmin } = useAuth();

  if (!force && !isAdmin) return null;

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border border-red-cinema bg-red-cinema/10",
        "px-2.5 py-0.5 text-[10px] font-black tracking-wide text-red-cinema uppercase",
        className,
      )}
    >
      <ShieldIcon className="text-[14px]" />
      Admin
    </span>
  );
}
