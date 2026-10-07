import type { OrderStatus } from "@mini-galu/contracts";

/** Mientras se paga en el checkout, el stock queda reservado este tiempo. Links de pago (fase 4): 72 h. */
export const CHECKOUT_RESERVATION_MINUTES = 30;

/** Estados con el pago ya aprobado. */
export const PAID_STATUSES: readonly OrderStatus[] = ["nuevo", "preparando", "listo", "en_camino", "entregado"];

export const formatOrderNumber = (n: number) => `MG-${n}`;

export function parseOrderNumber(s: string): number | null {
  const m = /^(?:MG-?)?(\d{4,9})$/i.exec(s.trim());
  return m ? Number(m[1]) : null;
}

export type Totals = { subtotalCents: number; discountCents: number; shippingCents: number; totalCents: number };

/** El descuento nunca supera el subtotal; el envío gratis de un cupón pone el envío en 0. */
export function computeTotals(input: {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  freeShipping: boolean;
}): Totals {
  const discountCents = Math.min(Math.max(0, input.discountCents), input.subtotalCents);
  const shippingCents = input.freeShipping ? 0 : input.shippingCents;
  return {
    subtotalCents: input.subtotalCents,
    discountCents,
    shippingCents,
    totalCents: input.subtotalCents - discountCents + shippingCents,
  };
}
