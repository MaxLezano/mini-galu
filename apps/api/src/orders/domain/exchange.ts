import type { OrderStatus } from "@mini-galu/contracts";
import { PAID_STATUSES } from "./order";

/**
 * Por qué no se puede cambiar el talle (null si se puede): solo prendas de un pedido pagado (no la compra de una gift
 * card, ni uno sin pagar, cancelado o reintegrado), a otro talle del mismo modelo que tenga stock.
 */
export function exchangeBlocked(
  o: { kind: "prendas" | "giftcard"; status: OrderStatus },
  item: { size: string; qty: number; returnedQty?: number } | null,
  to: { size: string; stock: number } | null,
  qty: number,
): string | null {
  if (o.kind !== "prendas" || !PAID_STATUSES.includes(o.status))
    return "Solo se cambia el talle de las prendas de un pedido pagado";
  if (!item) return "Esa prenda ya no está en el pedido: actualizá la página";
  // las unidades devueltas (devolución parcial) ya no están para cambiar
  const left = item.qty - (item.returnedQty ?? 0);
  if (qty > left) return left ? `El pedido tiene ${left} de esa prenda` : "Esa prenda ya se devolvió";
  if (!to) return "Ese modelo no viene en ese talle";
  if (to.size === item.size) return "Elegí un talle distinto";
  if (to.stock < qty) return `No queda talle ${to.size}${to.stock ? ` para ${qty}` : ""}`;
  return null;
}

/** Línea del historial: "Maddie · talle 4 → 6 · talle 4 al stock · "le quedó chico"". */
export function exchangeDetail(x: {
  name: string;
  from: string;
  to: string;
  qty: number;
  restocked: boolean;
  reason: string;
}): string {
  return [
    `${x.name}${x.qty > 1 ? ` (${x.qty})` : ""} · talle ${x.from} → ${x.to}`,
    x.restocked ? `talle ${x.from} al stock` : null,
    x.reason ? `"${x.reason}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
