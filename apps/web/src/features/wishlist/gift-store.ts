"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Una prenda de una lista de cumple que alguien eligió regalar (va a la bolsa y al pedido). */
export type GiftPick = { itemId: string; slug: string; size: string; list: string };

type GiftState = {
  picks: GiftPick[];
  pick: (g: GiftPick) => void;
  /** Las que siguen en la bolsa (misma prenda y talle): esas viajan con el pedido. */
  forCart: (lines: { slug: string; size: string }[]) => string[];
  clear: () => void;
};

/** Regalos elegidos desde /lista/…: se guardan en el navegador hasta pagar. */
export const useGifts = create<GiftState>()(
  persist(
    (set, get) => ({
      picks: [],
      pick: (g) => set({ picks: [...get().picks.filter((x) => x.itemId !== g.itemId), g] }),
      forCart: (lines) =>
        get()
          .picks.filter((g) => lines.some((l) => l.slug === g.slug && l.size === g.size))
          .map((g) => g.itemId),
      clear: () => set({ picks: [] }),
    }),
    { name: "mg-gifts-v1", storage: createJSONStorage(() => localStorage) },
  ),
);
