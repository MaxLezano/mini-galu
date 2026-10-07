/** Ítem guardado: variante (prenda + talle) y cantidad. */
export type CartItem = { variantId: string; qty: number };

/**
 * Suma `incoming` a `current` sin pasarse del stock de cada talle. Se usa al pasar la bolsa del navegador
 * (o la de invitada) a la del servidor: lo que no entra se descarta en silencio.
 */
export function mergeItems(current: CartItem[], incoming: CartItem[], stockOf: (variantId: string) => number) {
  const qty = new Map(current.map((i) => [i.variantId, i.qty]));
  for (const i of incoming) qty.set(i.variantId, (qty.get(i.variantId) ?? 0) + i.qty);
  return [...qty]
    .map(([variantId, q]) => ({ variantId, qty: Math.min(q, stockOf(variantId)) }))
    .filter((i) => i.qty > 0);
}
