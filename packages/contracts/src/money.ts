/** Los precios viajan siempre en centavos (int). Nunca float. */
export type Cents = number;

/** Envío gratis desde $90.000. */
export const FREE_SHIPPING_FROM_CENTS: Cents = 90_000_00;

const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** 3800000 → "$38.000" (es-AR, sin depender del ICU del entorno: igual en server y browser). */
export function formatARS(cents: Cents): string {
  const pesos = Math.round(cents / 100);
  return `${pesos < 0 ? "-" : ""}$${groupThousands(Math.abs(pesos))}`;
}

/** Valor de cada cuota sin interés (las cuotas con interés las calcula Mercado Pago). */
export function installment(cents: Cents, n: number): Cents {
  return Math.round(cents / n);
}

export function discountPercent(priceCents: Cents, compareAtCents: Cents | null | undefined): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
