/** Los precios viajan siempre en centavos (int). Nunca float. */
export type Cents = number;

const groupThousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

/** 3800000 → "$38.000" (es-AR, sin depender del ICU del entorno: igual en server y browser). */
export function formatARS(cents: Cents): string {
  const pesos = Math.round(cents / 100);
  return `${pesos < 0 ? "-" : ""}$${groupThousands(Math.abs(pesos))}`;
}

/** 3800050 → "$38.000,50": con centavos, para los comprobantes fiscales (tienen que dar el importe exacto). */
export function formatARSExact(cents: Cents): string {
  const abs = Math.abs(Math.round(cents));
  return `${cents < 0 ? "-" : ""}$${groupThousands(Math.floor(abs / 100))},${String(abs % 100).padStart(2, "0")}`;
}

/** Valor de cada cuota sin interés (las cuotas con interés las calcula Mercado Pago). */
export function installment(cents: Cents, n: number): Cents {
  return Math.round(cents / n);
}

export function discountPercent(priceCents: Cents, compareAtCents: Cents | null | undefined): number | null {
  if (!compareAtCents || compareAtCents <= priceCents) return null;
  return Math.round((1 - priceCents / compareAtCents) * 100);
}
