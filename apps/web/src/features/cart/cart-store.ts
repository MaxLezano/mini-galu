"use client";

import type { ProductSummary, Size } from "@mini-galu/contracts";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { cover, stockOf } from "@/lib/product";

/**
 * Bolsa de invitada. Fase 2: vive en localStorage.
 * Fase 3 (cart): pasa a la API con cookie de invitada + merge al loguear; esta interfaz se mantiene.
 */
export type CartLine = {
  slug: string;
  size: Size;
  qty: number;
  name: string;
  colorName: string;
  priceCents: number;
  imageUrl: string;
  maxStock: number;
};

type AddResult = { ok: true } | { ok: false; reason: "no_stock"; max: number };

type CartState = {
  lines: CartLine[];
  add: (p: ProductSummary, size: Size) => AddResult;
  setQty: (i: number, qty: number) => AddResult;
  remove: (i: number) => void;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
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
        return { ok: true };
      },
      remove(i) {
        set({ lines: get().lines.filter((_, k) => k !== i) });
      },
    }),
    { name: "mg-cart-v3", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((a, l) => a + l.qty, 0);
export const cartTotal = (lines: CartLine[]) => lines.reduce((a, l) => a + l.priceCents * l.qty, 0);
