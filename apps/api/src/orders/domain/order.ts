import type { OrderStatus } from "@mini-galu/contracts";

/** Mientras se paga en el checkout, el stock queda reservado este tiempo (los links de pago, 72 h). */
export const CHECKOUT_RESERVATION_MINUTES = 30;

/** Estados con el pago ya aprobado. */
export const PAID_STATUSES: readonly OrderStatus[] = ["nuevo", "preparando", "listo", "en_camino", "entregado"];

export const formatOrderNumber = (n: number) => `MG-${n}`;

/** Página de la tienda donde se paga un pedido sin cuenta (links de pago y vuelta de Mercado Pago). */
export const payPath = (number: string, token: string) => `/pagar/${number}?t=${encodeURIComponent(token)}`;

export function parseOrderNumber(s: string): number | null {
  const m = /^(?:MG-?)?(\d{4,9})$/i.exec(s.trim());
  return m ? Number(m[1]) : null;
}

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  /** Lo que paga la gift card (hasta su saldo y hasta lo que queda por pagar). */
  giftcardCents: number;
  totalCents: number;
};

/** El descuento nunca supera el subtotal; el envío gratis de un cupón pone el envío en 0; la gift card paga último. */
export function computeTotals(input: {
  subtotalCents: number;
  shippingCents: number;
  discountCents: number;
  freeShipping: boolean;
  /** Saldo de la gift card aplicada (0 sin gift card). */
  giftcardBalanceCents?: number;
}): Totals {
  const discountCents = Math.min(Math.max(0, input.discountCents), input.subtotalCents);
  const shippingCents = input.freeShipping ? 0 : input.shippingCents;
  const due = input.subtotalCents - discountCents + shippingCents;
  const giftcardCents = Math.min(Math.max(0, input.giftcardBalanceCents ?? 0), due);
  return {
    subtotalCents: input.subtotalCents,
    discountCents,
    shippingCents,
    giftcardCents,
    totalCents: due - giftcardCents,
  };
}
