import type { OrderStatus, ShippingMethod } from "@mini-galu/contracts";

/** Estados con el pago aprobado, en el orden en que avanza un pedido. */
const PAID_FLOW: readonly OrderStatus[] = ["nuevo", "preparando", "listo", "en_camino", "entregado"];

/** El siguiente paso de un pedido (null si ya terminó o todavía no se pagó). Retiro en el taller: listo → entregado. */
export function nextStatus(status: OrderStatus, shipping: ShippingMethod): OrderStatus | null {
  if (status === "listo" && shipping === "taller") return "entregado";
  const i = PAID_FLOW.indexOf(status);
  return i >= 0 && i < PAID_FLOW.length - 1 ? (PAID_FLOW[i + 1] ?? null) : null;
}

/**
 * Qué cambios de estado puede hacer el taller a mano (tablero, detalle, acciones en lote).
 * Solo entre estados pagados: nunca volver a "esperando pago" ni pagar a mano; un retiro no pasa por "en camino".
 */
export function canMove(from: OrderStatus, to: OrderStatus, shipping: ShippingMethod): string | null {
  if (from === to) return "El pedido ya está en ese estado";
  if (!PAID_FLOW.includes(from)) return "Ese pedido no está pagado: no se puede mover";
  if (!PAID_FLOW.includes(to)) return "Un pedido pagado no puede volver a esperar el pago";
  if (to === "en_camino" && shipping === "taller") return "Un pedido que se retira en el taller no sale en camino";
  return null;
}

/** Texto del historial para cada estado al que se mueve un pedido. */
export function statusTitle(to: OrderStatus, shipping: ShippingMethod): string {
  if (to === "preparando") return "En preparación";
  if (to === "listo") return shipping === "taller" ? "Listo para retirar" : "Listo para despachar";
  if (to === "en_camino") return "Despachado";
  if (to === "entregado") return shipping === "taller" ? "Retirado en el taller" : "Entregado";
  if (to === "nuevo") return "Volvió a nuevos";
  return to;
}
