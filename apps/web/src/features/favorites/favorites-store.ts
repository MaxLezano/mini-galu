"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/** Favoritos de invitada (localStorage). En la fase 8 se sincronizan con la cuenta. */
type FavState = { slugs: string[]; toggle: (slug: string) => boolean };

export const useFavorites = create<FavState>()(
  persist(
    (set, get) => ({
      slugs: [],
      toggle(slug) {
        const on = !get().slugs.includes(slug);
        set({ slugs: on ? [...get().slugs, slug] : get().slugs.filter((s) => s !== slug) });
        return on;
      },
    }),
    { name: "mg-favs-v3", storage: createJSONStorage(() => localStorage), skipHydration: true },
  ),
);
