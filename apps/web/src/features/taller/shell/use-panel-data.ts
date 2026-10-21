"use client";

import type {
  AdminCustomer,
  AdminOrderSummary,
  AdminProduct,
  AssistantOverview,
  InvoiceProblem,
} from "@mini-galu/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import { adminApi } from "@/lib/admin-api";
import { PANEL_CHANGED } from "./panel-events";

const READ_KEY = "mg-taller-leidas";

/**
 * Pedidos, productos, reseñas para revisar y lo pendiente de Galú para el menú, la campana y la búsqueda: se recargan al navegar, al cambiar
 * algo y cada minuto. Los clientes solo los usa la búsqueda: se piden la primera vez que se la abre.
 */
export function usePanelData(pathname: string) {
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [products, setProducts] = useState<AdminProduct[] | null>(null);
  const [galu, setGalu] = useState<AssistantOverview | null>(null);
  const [customers, setCustomers] = useState<AdminCustomer[] | null>(null);
  const [pendingReviews, setPendingReviews] = useState(0);
  const [invoiceProblems, setInvoiceProblems] = useState<InvoiceProblem[]>([]);
  const [read, setRead] = useState<Set<string>>(new Set());
  const wantsCustomers = useRef(false);

  const loadCustomers = useCallback(() => {
    adminApi.customers().then(
      (c) => setCustomers(c.customers),
      () => {},
    );
  }, []);
  const reload = useCallback(() => {
    adminApi.orders().then(setOrders, () => {});
    adminApi.products().then(setProducts, () => {});
    adminApi.assistantOverview().then(setGalu, () => {});
    adminApi.invoiceProblems().then(setInvoiceProblems, () => {});
    adminApi.reviews().then(
      (r) => setPendingReviews(r.filter((x) => x.status === "pendiente").length),
      () => {},
    );
    if (wantsCustomers.current) loadCustomers();
  }, [loadCustomers]);
  /** La búsqueda se abrió: desde ahora los clientes se recargan con lo demás. */
  const needCustomers = useCallback(() => {
    if (wantsCustomers.current) return;
    wantsCustomers.current = true;
    loadCustomers();
  }, [loadCustomers]);

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

  return { orders, products, customers, needCustomers, galu, pendingReviews, invoiceProblems, read, markRead };
}
