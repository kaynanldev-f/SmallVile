"use client";

import clsx from "clsx";

interface AdminFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export default function AdminField({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: AdminFieldProps) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-bold text-grayScale-400">
        {label}
      </label>

      {children}

      {hint && !error && (
        <p className="text-[11px] text-grayScale-400">{hint}</p>
      )}

      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

/** Estilo compartilhado por inputs, selects e textareas do admin. */
export const adminInputClass =
  "w-full rounded-lg border border-grayScale-600 bg-grayScale-700 px-3 py-2 text-sm text-grayScale-200 outline-none transition-colors focus:border-red-cinema";
