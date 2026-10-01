"use client";

import { useState } from "react";
import Image from "next/image";
import MovieIcon from "@mui/icons-material/Movie";

interface MoviePosterProps {
  /** URL do pôster como o backend devolve em `movie.banner`. */
  src?: string;
  alt: string;
  /** Repassado ao `next/image`; o pai precisa ser `relative`. */
  sizes?: string;
  className?: string;
  priority?: boolean;
}

/** Pôster do filme, sempre a partir da imagem real do cadastro. */
export default function MoviePoster({
  src,
  alt,
  sizes,
  className = "",
  priority,
}: MoviePosterProps) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-linear-to-br from-grayScale-600 to-deep-black p-4 text-center ${className}`}
      >
        <MovieIcon className="text-grayScale-500" fontSize="large" />

        <span className="line-clamp-3 text-xs font-bold text-grayScale-400">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <>
      {/* Placeholder de carregamento: evita o buraco preto enquanto baixa. */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-grayScale-600" />
      )}

      <Image
        src={src}
        alt={alt}
        fill
        /**
         * As capas vêm do Firebase Storage com URL assinada; o otimizador do
         * Next não lida com a query de assinatura, então servimos direto.
         */
        unoptimized={src.startsWith("http")}
        sizes={sizes}
        priority={priority}
        onError={() => setFailed(true)}
        onLoad={() => setLoaded(true)}
        className={className}
      />
    </>
  );
}
