"use client";

import Link from "next/link";
import ContactSupport from "@mui/icons-material/ContactSupport";
import { SuportButtonProps } from "@/src/types";

/** Atalho flutuante para o atendimento. */
export default function SuportButton({
  phone,
  message = "Olá! Gostaria de mais informações.",
}: SuportButtonProps) {
  const url = `https://eva-app.app.n8n.cloud/webhook/51530510-fe55-40b4-b2f8-6c2d990db3bf/chat`;

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Abrir o suporte SmallVille"
      title="Suporte"
      className="
        fixed
        bottom-5
        right-5
        z-50
        flex
        h-14
        w-14
        items-center
        justify-center
        rounded-full
        border
        border-white/10
        bg-red-cinema
        text-white
        shadow-lg
        shadow-black/40
        transition-all
        duration-300
        hover:bg-button-primary-hover
        hover:scale-110
        hover:shadow-2xl
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-red-cinema
        focus-visible:ring-offset-2
        focus-visible:ring-offset-deep-black
        active:scale-95
        active:bg-red-cinema
        sm:bottom-6
        sm:right-6
        sm:h-16
        sm:w-16
      "
    >
      <ContactSupport fontSize={"large"} />
    </Link>
  );
}
