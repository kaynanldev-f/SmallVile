"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import NotificationsIcon from "@mui/icons-material/NotificationsNoneOutlined";
import {
  getMyNotifications,
  getUnreadNotificationsCount,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/src/actions/notificationActions";
import { Notification } from "@/src/types/notification";
import NotificationItem from "./NotificationItem";

/** Quantas notificações o painel mostra antes do "ver todas". */
const PANEL_SIZE = 8;

/** Intervalo de atualização do contador, em milissegundos. */
const POLL_INTERVAL = 60_000;

/** Falhas seguidas antes de desistir do polling. */
const MAX_POLL_FAILURES = 3;

/** Largura desejada do painel (22rem), em pixels. */
const PANEL_WIDTH = 352;

/** Respiro mínimo entre o painel e a borda da tela. */
const VIEWPORT_GAP = 8;

/** Altura mínima aceitável antes de o painel virar uma faixa inútil. */
const MIN_PANEL_HEIGHT = 180;

interface PanelPosition {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

/** Posição do painel a partir do sino, presa dentro da janela. */
function computePanelPosition(anchor: HTMLElement): PanelPosition {
  const rect = anchor.getBoundingClientRect();

  // `clientWidth` do documento, e não `innerWidth`: a barra de rolagem entra
  // em `innerWidth` e faria o painel encostar por baixo dela.
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;

  const width = Math.min(PANEL_WIDTH, viewportWidth - VIEWPORT_GAP * 2);

  // Alinhado pela direita do sino, mas nunca ultrapassando as bordas.
  const preferredLeft = rect.right - width;
  const maxLeft = viewportWidth - width - VIEWPORT_GAP;
  const left = Math.min(Math.max(preferredLeft, VIEWPORT_GAP), Math.max(maxLeft, VIEWPORT_GAP));

  const top = rect.bottom + VIEWPORT_GAP;

  return {
    top,
    left,
    width,
    // O que sobra até o rodapé da janela. Em celular deitado sobra pouco, e o
    // painel rola por dentro em vez de vazar.
    maxHeight: Math.max(viewportHeight - top - VIEWPORT_GAP, MIN_PANEL_HEIGHT),
  };
}

/** Sino de notificações do cabeçalho. */
export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Falhas seguidas param o polling em vez de repetir um pedido que já falhou.
  const failures = useRef(0);

  /* Âncora e posição do painel — ver `computePanelPosition`. */
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<PanelPosition | null>(null);

  const reposition = useCallback(() => {
    if (buttonRef.current) setPosition(computePanelPosition(buttonRef.current));
  }, []);

  /** A posição inicial é calculada em `toggle`, antes da primeira renderização do painel. */
  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);

    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, reposition]);

  const refreshCount = useCallback(async () => {
    if (failures.current >= MAX_POLL_FAILURES) return;

    try {
      const result = await getUnreadNotificationsCount();

      if (!result.success) {
        failures.current += 1;
        return;
      }

      failures.current = 0;
      setUnread(typeof result.data === "number" ? result.data : 0);
    } catch {
      // A ação de servidor pode falhar antes de devolver um ActionResult
      // (rede caída, deploy no meio da requisição). O sino não pode explodir
      // por isso.
      failures.current += 1;
    }
  }, []);

  useEffect(() => {
    // Primeira leitura fora do corpo síncrono do efeito (setTimeout de 0).
    const first = setTimeout(refreshCount, 0);
    const interval = setInterval(refreshCount, POLL_INTERVAL);

    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [refreshCount]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await getMyNotifications(1, PANEL_SIZE);

      if (!result.success) {
        setError(result.error);
        return;
      }

      // `items` vem sempre como lista da ação, mas o painel não depende disso:
      // um envelope inesperado vira lista vazia, e não um `.map` de undefined.
      setItems(Array.isArray(result.data.items) ? result.data.items : []);
      setUnread(result.data.unreadCount ?? 0);
      failures.current = 0;
    } catch {
      setError("Não foi possível carregar suas notificações.");
    } finally {
      setLoading(false);
    }
  }, []);

  function toggle() {
    const next = !open;

    // Medir aqui, e não em um efeito, evita o quadro com o painel fora de lugar.
    if (next) reposition();

    setOpen(next);

    if (next) loadItems();
  }

  function handleMarkRead(id: string) {
    startTransition(async () => {
      const result = await markNotificationAsRead(id).catch(() => null);

      if (!result?.success) {
        setError(
          result?.error ?? "Não foi possível marcar a notificação como lida.",
        );
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read: true } : item,
        ),
      );

      setUnread((current) => Math.max(current - 1, 0));
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      const result = await markAllNotificationsAsRead().catch(() => null);

      if (!result?.success) {
        setError(
          result?.error ?? "Não foi possível marcar as notificações como lidas.",
        );
        return;
      }

      setItems((current) => current.map((item) => ({ ...item, read: true })));
      setUnread(0);
    });
  }

  const badge = unread > 99 ? "99+" : String(unread);

  const panel = (
    <>
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-[60]"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-label="Notificações"
        style={{
          top: position?.top ?? 0,
          left: position?.left ?? 0,
          width: position?.width ?? PANEL_WIDTH,
          maxHeight: position?.maxHeight ?? MIN_PANEL_HEIGHT,
          // Enquanto a medida não chegou o painel fica invisível, para não
          // piscar no canto superior esquerdo antes de ser posicionado.
          visibility: position ? "visible" : "hidden",
        }}
        className="fixed z-[61] flex flex-col overflow-hidden rounded-xl border border-grayScale-600 bg-gray-surface shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-grayScale-600 px-4 py-3">
          <h2 className="text-sm font-black text-grayScale-200">
            Notificações
          </h2>

          {unread > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              disabled={isPending}
              className="cursor-pointer text-right text-[11px] font-bold text-red-cinema transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* `min-h-0` para o flex deixar esta faixa encolher e rolar por dentro
            em vez de esticar o painel para fora da tela. */}
        <div className="custom-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {loading && (
            <p className="px-4 py-6 text-center text-xs text-grayScale-400">
              Carregando...
            </p>
          )}

          {!loading && error && (
            <p
              role="alert"
              className="m-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-400"
            >
              {error}
            </p>
          )}

          {!loading && !error && items.length === 0 && (
            <p className="px-4 py-8 text-center text-xs text-grayScale-400">
              Você não possui novas notificações.
            </p>
          )}

          {!loading && !error && items.length > 0 && (
            <ul className="divide-y divide-grayScale-600">
              {items.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={handleMarkRead}
                  onNavigate={() => setOpen(false)}
                  isPending={isPending}
                />
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-grayScale-600 px-4 py-2.5 text-center">
          <Link
            href="/notificacoes"
            onClick={() => setOpen(false)}
            className="text-xs font-bold text-grayScale-300 transition-colors hover:text-white"
          >
            Ver todas as notificações
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={
          unread > 0
            ? `Notificações: ${unread} não lidas`
            : "Notificações"
        }
        aria-expanded={open}
        className="relative flex items-center text-white"
      >
        <NotificationsIcon className="text-[22px] transition-all duration-500 hover:scale-110 hover:opacity-80 sm:text-[26px]" />

        {unread > 0 && (
          <span className="absolute -top-1 -right-1.5 min-w-4 rounded-full bg-red-cinema px-1 text-[10px] leading-4 font-black text-white">
            {badge}
          </span>
        )}
      </button>

      {/*
        O painel sai da árvore do cabeçalho e vai para o `body`. É o que
        garante que nem o flex do cabeçalho nem o `transform` da gaveta lateral
        interfiram na posição — e que a sombra não fique cortada por nenhum
        `overflow` no caminho.
      */}
      {open && createPortal(panel, document.body)}
    </>
  );
}
