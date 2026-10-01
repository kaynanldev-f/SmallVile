"use client";

import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  /** Escala do botão. */
  size?: "sm" | "md";
}

/**
 * O tamanho é uma prop, e não uma classe passada por fora, porque conflito de
 * utilitário do Tailwind é resolvido pela ordem no CSS gerado — não pela ordem
 * no atributo `class`.
 */
const sizes = {
  md: "px-3 py-2 text-sm sm:px-4 sm:py-2.5 sm:text-base",
  sm: "px-3 py-1.5 text-xs leading-tight",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  const variants = {
    primary: "bg-button-primary hover:scale-105",
    secondary: "bg-button-secondary border border-white hover:opacity-80",
  };

  return (
    <button
      {...props}
      className={clsx(
        "inline-flex items-center justify-center rounded-md",
        "font-bold text-white",
        "whitespace-nowrap",
        "transition-all duration-200",
        "cursor-pointer",
        "disabled:cursor-not-allowed disabled:opacity-50",
        sizes[size],
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
