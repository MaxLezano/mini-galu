/** Los precios viajan siempre en centavos (int). Nunca float. */
export type Cents = number;

export const MAX_INSTALLMENTS = 6;
/** Hasta este monto no se ofrecen cuotas (ej. moños). */
export const INSTALLMENTS_FROM_CENTS: Cents = 10_000_00;
/** Envío gratis desde $90.000. */
export const FREE_SHIPPING_FROM_CENTS: Cents = 90_000_00;

const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** 3800000 → "$38.000" (es-AR, sin depender del ICU del entorno: igual en server y browser). */
export function formatARS(cents: Cents): string {
  const pesos = Math.round(cents / 100);
  return `${pesos < 0 ? "-" : ""}$${groupThousands(Math.abs(pesos))}`;
}

export function installment(cents: Cents, n = MAX_INSTALLMENTS): Cents {
  return Math.round(cents / n);
}

export function offersInstallments(cents: Cents): boolean {
  return cents > INSTALLMENTS_FROM_CENTS;
}

export function discountPercent(priceCents: Cents, compareAtCents: Cents | null | undefined): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
