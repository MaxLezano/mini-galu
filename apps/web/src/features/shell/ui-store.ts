"use client";

import type { ReactNode } from "react";
import { create } from "zustand";

/** Estado de la capa de UI compartida (bolsa, Galú, buscador, menú, toast, modales). */
export type Toast = { id: number; content: ReactNode; icon?: ReactNode; image?: string };

type UiState = {
  drawerOpen: boolean;
  searchOpen: boolean;
  menuOpen: boolean;
  galu: { open: boolean; pending: string | null };
  toast: Toast | null;
  modal: string | null;
  setDrawer: (open: boolean) => void;
  setSearch: (open: boolean) => void;
  setMenu: (open: boolean) => void;
  openGalu: (question?: string) => void;
  closeGalu: () => void;
  consumeGaluQuestion: () => string | null;
  showToast: (t: Omit<Toast, "id">) => void;
  hideToast: (id: number) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
};

let toastId = 0;

export const useUi = create<UiState>()((set, get) => ({
  drawerOpen: false,
  searchOpen: false,
  menuOpen: false,
  galu: { open: false, pending: null },
  toast: null,
  modal: null,
  setDrawer: (drawerOpen) => set({ drawerOpen }),
  setSearch: (searchOpen) => set({ searchOpen }),
  setMenu: (menuOpen) => set({ menuOpen }),
  openGalu: (question) => set({ galu: { open: true, pending: question ?? null }, searchOpen: false, menuOpen: false }),
  closeGalu: () => set({ galu: { open: false, pending: null } }),
  consumeGaluQuestion: () => {
    const q = get().galu.pending;
    if (q) set({ galu: { open: true, pending: null } });
    return q;
  },
  showToast: (t) => {
    const id = ++toastId;
    set({ toast: { ...t, id } });
    setTimeout(() => get().hideToast(id), 2800);
  },
  hideToast: (id) => {
    if (get().toast?.id === id) set({ toast: null });
  },
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
}));

export const toast = (content: ReactNode, opts: { icon?: ReactNode; image?: string } = {}) =>
  useUi.getState().showToast({ content, ...opts });
