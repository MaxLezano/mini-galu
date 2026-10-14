"use client";

import { create } from "zustand";
import { accountApi, type SessionUser } from "@/lib/account-api";
import { useFavorites } from "../favorites/favorites-store";

type AccountState = {
  status: "loading" | "guest" | "in";
  user: SessionUser | null;
  /** Consulta la sesión (al montar la tienda y después de ingresar o salir). */
  load: () => Promise<void>;
  signOut: () => Promise<void>;
};

/**
 * Sesión de la tienda en el navegador. Al ingresar, los favoritos guardados en el navegador se suben a la cuenta y
 * desde ahí la cuenta manda (los favoritos quedan sincronizados entre dispositivos).
 */
export const useAccount = create<AccountState>()((set, get) => ({
  status: "loading",
  user: null,
  async load() {
    const user = await accountApi.session();
    set({ user, status: user ? "in" : "guest" });
    if (user) {
      const local = useFavorites.getState().slugs;
      const slugs = await accountApi.mergeFavorites(local).catch(() => null);
      if (slugs) useFavorites.setState({ slugs });
    }
  },
  async signOut() {
    await accountApi.signOut().catch(() => {});
    set({ user: null, status: "guest" });
    if (get().status === "guest") useFavorites.setState({ slugs: [] });
  },
}));
