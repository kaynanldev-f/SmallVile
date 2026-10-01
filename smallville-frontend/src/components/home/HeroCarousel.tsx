"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Pause from "@mui/icons-material/Pause";
import PlayArrow from "@mui/icons-material/PlayArrow";
import clsx from "clsx";

import Hero from "./Hero";
import { CatalogMovie } from "@/src/types/admin";

/** Tempo entre trocas automáticas. */
const ROTATION_MS = 10_000;

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * A preferência de movimento é estado de fora do React, então é lida com
 * `useSyncExternalStore` em vez de um `useState` alimentado por efeito: nada
 * de render extra no primeiro paint, e o valor nunca fica atrasado em relação
 * ao sistema operacional.
 */
function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

function getReducedMotionOnServer() {
  return false;
}

interface HeroCarouselProps {
  /** Filmes reais do catálogo, já carregados pela página. */
  movies: CatalogMovie[];
  /** Destaque por filme (`_id` → texto), ex.: próxima sessão. */
  highlights?: Record<string, string>;
  /** O Header, que fica sobre a imagem de destaque. */
  children?: React.ReactNode;
}

/** Destaque rotativo da Home. */
export default function HeroCarousel({
  movies,
  highlights,
  children,
}: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    getReducedMotionOnServer,
  );

  const total = movies.length;

  const goTo = useCallback(
    (next: number) => {
      if (total < 1) return;

      setIndex(((next % total) + total) % total);
    },
    [total],
  );

  useEffect(() => {
    if (total < 2 || paused) return;

    const timer = setTimeout(
      () => setIndex((current) => (current + 1) % total),
      ROTATION_MS,
    );

    return () => clearTimeout(timer);
  }, [index, paused, total]);

  const current = movies[Math.min(index, Math.max(total - 1, 0))];

  return (
    <div
      className="relative flex min-h-screen w-full flex-col p-4"
      role="region"
      aria-roledescription="carrossel"
      aria-label="Filmes em destaque"
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") goTo(index - 1);
        if (event.key === "ArrowRight") goTo(index + 1);
      }}
    >
      {/*
        Camadas de fundo, todas em `z-0` e empilhadas pela ordem no JSX:
        imagem institucional (base/fallback) → capas dos filmes → véu escuro.

        Nada aqui usa z-index negativo. Este container é apenas `relative`, ou
        seja, não cria contexto de empilhamento — filhos com `-z-10` acabavam
        pintados ATRÁS do fundo do próprio container, e era por isso que a
        imagem institucional aparecia para todos os filmes e o banner parecia
        nunca acompanhar o carrossel.
      */}
      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-[url('/assets/img-hero.png')] bg-cover bg-center"
      />

      {movies.map((movie, position) =>
        movie.banner ? (
          <Image
            key={movie._id}
            src={movie.banner}
            alt=""
            aria-hidden="true"
            fill
            priority={position === 0}
            unoptimized={movie.banner.startsWith("http")}
            sizes="100vw"
            className={clsx(
              "z-0 object-cover",
              !reducedMotion && "transition-opacity duration-700",
              // A capa visível é sempre a do filme do índice atual: imagem,
              // título, sinopse e botões saem do mesmo objeto `movies[index]`.
              position === index ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null,
      )}

      <div
        aria-hidden="true"
        className="absolute inset-0 z-0 bg-linear-to-r from-deep-black/95 via-deep-black/70 to-deep-black/30"
      />

      <div className="relative z-10 flex flex-1 flex-col">
        {children}

        {!current ? (
          <div className="flex min-h-screen items-center justify-center">
            <p className="rounded-xl border border-grayScale-600 bg-gray-surface/80 px-6 py-10 text-center text-sm text-grayScale-400">
              Nenhum filme em destaque no momento.
            </p>
          </div>
        ) : (
          <Hero movie={current} highlight={highlights?.[current._id]} />
        )}
      </div>

      {total > 1 && (
        <>
          {/* Estado atual para leitores de tela, sem poluir a tela. */}
          <p aria-live="polite" className="sr-only">
            {`Filme ${index + 1} de ${total}: ${current?.title ?? ""}`}
          </p>

          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Filme anterior"
            className="absolute top-1/2 left-2 z-20 -translate-y-1/2 cursor-pointer rounded-full bg-deep-black/70 p-2 text-white transition-colors hover:bg-red-cinema focus-visible:ring-2 focus-visible:ring-red-cinema focus-visible:outline-none sm:left-4"
          >
            <ChevronLeft />
          </button>

          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Próximo filme"
            className="absolute top-1/2 right-2 z-20 -translate-y-1/2 cursor-pointer rounded-full bg-deep-black/70 p-2 text-white transition-colors hover:bg-red-cinema focus-visible:ring-2 focus-visible:ring-red-cinema focus-visible:outline-none sm:right-4"
          >
            <ChevronRight />
          </button>

          <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3">
            <div className="flex items-center gap-2">
              {movies.map((movie, position) => (
                <button
                  key={movie._id}
                  type="button"
                  onClick={() => goTo(position)}
                  aria-label={`Ver destaque: ${movie.title}`}
                  aria-current={position === index}
                  className={clsx(
                    "h-2 cursor-pointer rounded-full transition-all focus-visible:ring-2 focus-visible:ring-red-cinema focus-visible:outline-none",
                    position === index
                      ? "w-8 bg-red-cinema"
                      : "w-2 bg-white/50 hover:bg-white",
                  )}
                />
              ))}
            </div>

            {/*
              Exigência de acessibilidade para conteúdo que se move sozinho:
              o usuário precisa de um jeito explícito de parar a rotação.
            */}
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              aria-label={
                paused ? "Retomar rotação automática" : "Pausar rotação automática"
              }
              className="cursor-pointer rounded-full bg-deep-black/60 p-1.5 text-white transition-colors hover:bg-red-cinema focus-visible:ring-2 focus-visible:ring-red-cinema focus-visible:outline-none"
            >
              {paused ? (
                <PlayArrow fontSize="small" />
              ) : (
                <Pause fontSize="small" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
