"use client";

import type { Collection, Launch, ProductSummary, StorePolicies } from "@mini-galu/contracts";
import { createContext, type ReactNode, useContext } from "react";

/** Datos que comparten header, buscador y Galú (se cargan una vez en el layout de la tienda). */
export type ShellData = {
  products: ProductSummary[];
  collections: Collection[];
  launch: Launch | null;
  announcements: string[];
  /** Días de cambio, envío gratis, formas de entrega y tarifas (se editan en el panel). */
  policies: StorePolicies;
};

const Ctx = createContext<ShellData | null>(null);

export function ShellDataProvider({ value, children }: { value: ShellData; children: ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useShellData(): ShellData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useShellData fuera de ShellDataProvider");
  return v;
}

/** Días que faltan para el lanzamiento, como en el navbar del mockup. */
export function launchCountLabel(launch: Launch | null, now = Date.now()): string | null {
  if (!launch) return null;
  const days = Math.ceil((new Date(launch.startsAt).getTime() - now) / 864e5);
  if (days < 0) return null;
  return days > 1 ? `${days} días` : days === 1 ? "mañana" : "¡hoy!";
}
