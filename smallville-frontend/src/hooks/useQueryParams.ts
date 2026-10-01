"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";

/** Estado de listagem (página, filtro, busca) na URL. */
export function useQueryParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const buildUrl = useCallback(
    (changes: Record<string, string | number | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }

      const query = params.toString();

      return query ? `${pathname}?${query}` : pathname;
    },
    [pathname, searchParams],
  );

  /** Navega para a mesma tela com os parâmetros alterados. */
  const update = useCallback(
    (changes: Record<string, string | number | null>) => {
      startTransition(() => {
        router.push(buildUrl(changes), { scroll: false });
      });
    },
    [buildUrl, router],
  );

  return { searchParams, buildUrl, update, isPending };
}
