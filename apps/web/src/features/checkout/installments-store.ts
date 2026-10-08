"use client";

import type { InstallmentPlan } from "@mini-galu/contracts";
import { useEffect } from "react";
import { create } from "zustand";
import { api } from "@/lib/api";

/**
 * Cuotas reales de Mercado Pago por monto (la API las consulta y guarda 1 hora). Las tarjetas del catálogo piden
 * su precio; los pedidos se juntan en una sola llamada. Mientras no hay respuesta no se promete nada.
 */
type State = { plans: Record<number, InstallmentPlan>; request: (amount: number) => void };

const pending = new Set<number>();
let timer: ReturnType<typeof setTimeout> | null = null;

export const useInstallmentsStore = create<State>()((set, get) => ({
  plans: {},
  request(amount) {
    if (!amount || amount in get().plans || pending.has(amount)) return;
    pending.add(amount);
    if (timer) return;
    timer = setTimeout(async () => {
      const amounts = [...pending];
      timer = null;
      try {
        const plans = await api.installments(amounts);
        set((s) => ({ plans: { ...s.plans, ...plans } }));
      } catch {
        // sin respuesta: queda sin promesa de cuotas
      } finally {
        for (const a of amounts) pending.delete(a);
      }
    }, 40);
  },
}));

/** Plan de cuotas para un monto en centavos (null hasta que responda Mercado Pago). */
export function useInstallmentPlan(amountCents: number): InstallmentPlan | null {
  const plan = useInstallmentsStore((s) => s.plans[amountCents] ?? null);
  const request = useInstallmentsStore((s) => s.request);
  useEffect(() => request(amountCents), [amountCents, request]);
  return plan;
}
