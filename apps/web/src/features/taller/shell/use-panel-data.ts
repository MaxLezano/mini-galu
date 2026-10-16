"use client";

import type { AdminOrderSummary, AdminProduct, AssistantOverview } from "@mini-galu/contracts";
import { useCallback, useEffect, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { PANEL_CHANGED } from "./panel-events";

const READ_KEY = "mg-taller-leidas";

/** Pedidos, productos y lo pendiente de Galú para el menú, la campana y la búsqueda: se recargan al navegar, al cambiar algo y cada minuto. */
export function usePanelData(pathname: string) {
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [galu, setGalu] = useState<AssistantOverview | null>(null);
  const [read, setRead] = useState<Set<string>>(new Set());

  const reload = useCallback(() => {
    adminApi.orders().then(setOrders, () => {});
    adminApi.products().then(setProducts, () => {});
    adminApi.assistantOverview().then(setGalu, () => {});
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: recarga al navegar entre pantallas
  useEffect(reload, [pathname]);
  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && reload(), 60_000);
    window.addEventListener(PANEL_CHANGED, reload);
    return () => {
      clearInterval(t);
      window.removeEventListener(PANEL_CHANGED, reload);
    };
  }, [reload]);
  useEffect(() => {
    try {
      setRead(new Set(JSON.parse(localStorage.getItem(READ_KEY) ?? "[]") as string[]));
    } catch {}
  }, []);

  /** Marca como leídas las novedades de ahora (se guardan solo esas, así la lista no crece para siempre). */
  const markRead = (keys: string[]) => {
    setRead(new Set(keys));
    try {
      localStorage.setItem(READ_KEY, JSON.stringify(keys));
    } catch {}
  };

  return { orders, products, galu, read, markRead };
}
