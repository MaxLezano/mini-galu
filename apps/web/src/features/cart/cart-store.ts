"use client";

import type { CartLine, CartView, ProductSummary, Size } from "@mini-galu/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { ApiRequestError, api } from "@/lib/api";
import { cover, stockOf } from "@/lib/product";

/**
 * Bolsa. La verdad está en la API (cookie de invitada `mg_cart`, o la cuenta cuando haya login de clientes).
 * localStorage queda como caché para pintar el contador al instante; los cambios son optimistas y después
 * se reemplazan por lo que responde el servidor (precios y stock de ahora).
 */
export type { CartLine };

type AddResult = { ok: true } | { ok: false; reason: "no_stock"; max: number };

type CartState = {
  lines: CartLine[];
  /** false hasta pasar la bolsa vieja del navegador al servidor (una sola vez). */
  synced: boolean;
  add: (p: ProductSummary, size: Size) => AddResult;
  setQty: (i: number, qty: number) => AddResult;
  remove: (i: number) => void;
  /** Trae la bolsa del servidor (al cargar la página y al entrar al checkout). */
  refresh: () => Promise<void>;
};

let writes = Promise.resolve();
/** Las escrituras van en fila para que la última respuesta sea la del último cambio. */
const enqueue = (fn: () => Promise<CartView>, onView: (v: CartView) => void, onError: () => void) => {
  writes = writes
    .then(fn)
    .then(onView)
    .catch((e) => {
      if (!(e instanceof ApiRequestError)) console.warn("[bolsa] sin conexión con la API", e);
      onError();
    });
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => {
      const apply = (v: CartView) => set({ lines: v.lines, synced: true });
      const reload = () => void get().refresh();
      return {
        lines: [],
        synced: false,
        add(p, size) {
          const max = stockOf(p, size);
          const lines = [...get().lines];
          const hit = lines.findIndex((l) => l.slug === p.slug && l.size === size);
          const current = hit >= 0 ? (lines[hit]?.qty ?? 0) : 0;
          if (current >= max) return { ok: false, reason: "no_stock", max };
          if (hit >= 0) lines[hit] = { ...(lines[hit] as CartLine), qty: current + 1, maxStock: max };
          else
            lines.push({
              slug: p.slug,
              size,
              qty: 1,
              name: p.name,
              colorName: p.color.name,
              priceCents: p.priceCents,
              imageUrl: cover(p),
              maxStock: max,
            });
          set({ lines });
          enqueue(() => api.cartAdd({ slug: p.slug, size, qty: 1 }), apply, reload);
          return { ok: true };
        },
        setQty(i, qty) {
          const lines = [...get().lines];
          const line = lines[i];
          if (!line) return { ok: true };
          if (qty > line.maxStock) return { ok: false, reason: "no_stock", max: line.maxStock };
          if (qty < 1) lines.splice(i, 1);
          else lines[i] = { ...line, qty };
          set({ lines });
          enqueue(() => api.cartSet({ slug: line.slug, size: line.size, qty: Math.max(0, qty) }), apply, reload);
          return { ok: true };
        },
        remove(i) {
          get().setQty(i, 0);
        },
        async refresh() {
          const { synced, lines } = get();
          try {
            // la primera vez, lo que había en el navegador (bolsa de la fase 2) se suma a la del servidor
            const v =
              !synced && lines.length
                ? await api.cartMerge(lines.map((l) => ({ slug: l.slug, size: l.size, qty: l.qty })))
                : await api.cart();
            apply(v);
          } catch (e) {
            console.warn("[bolsa] no se pudo sincronizar", e);
          }
        },
      };
    },
    {
      name: "mg-cart-v3",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({ lines: s.lines, synced: s.synced }),
    },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((a, l) => a + l.priceCents * l.qty, 0);
