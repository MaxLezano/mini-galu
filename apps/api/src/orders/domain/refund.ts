import type { AdminRefund, OrderStatus, PaymentMethod } from "@mini-galu/contracts";
import { PAID_STATUSES } from "./order";

/** Todavía en el taller: si se reintegra, lo normal es que las prendas vuelvan al stock. */
export const NOT_SHIPPED: readonly OrderStatus[] = ["nuevo", "preparando", "listo"];

export type RefundableOrder = {
  status: OrderStatus;
  kind: "prendas" | "giftcard";
  paidAt: Date | null;
  totalCents: number;
  giftcardCents: number;
  paymentMethod: PaymentMethod | null;
};

/**
 * Qué se devuelve si el taller reintegra el pedido (siempre el total: un cambio de talle no es un reintegro).
 * - Pedido pagado: el total por Mercado Pago y lo que se usó de una gift card, a su saldo.
 * - Venta del taller cobrada en efectivo: el total se devuelve en mano (no hay operación de Mercado Pago).
 * - Pago que llegó con la reserva vencida y sin stock (cancelado sin pagar, pero con el pago aprobado): solo la plata.
 * null si no hay nada para devolver (sin pagar, cancelado sin pago o ya reembolsado).
 */
export function refundPlan(o: RefundableOrder, hasPayment: boolean): AdminRefund | null {
  if (o.status === "cancelado" && !o.paidAt && hasPayment)
    return {
      cents: o.totalCents,
      cash: false,
      giftcardCents: 0,
      restock: false,
      restockSuggested: false,
      blocked: null,
    };
  if (!PAID_STATUSES.includes(o.status)) return null;
  const prendas = o.kind === "prendas";
  const cash = o.paymentMethod === "efectivo";
  return {
    cents: o.totalCents,
    cash,
    giftcardCents: prendas ? o.giftcardCents : 0,
    restock: prendas,
    restockSuggested: prendas && NOT_SHIPPED.includes(o.status),
    // pedidos cargados a mano o pagados antes de guardar los pagos: no hay a qué operación devolverle
    blocked:
      o.totalCents > 0 && !hasPayment && !cash
        ? "No está el pago de Mercado Pago de este pedido: reintegralo desde la cuenta de Mercado Pago"
        : null,
  };
}

/** Línea del historial: "$ 45.000 por Mercado Pago · $ 5.000 a la gift card · prendas al stock". */
export function refundDetail(
  r: { cents: number; cash: boolean; giftcardCents: number; restocked: boolean; pending: boolean; reason: string },
  money: (cents: number) => string,
): string {
  return [
    r.cents > 0
      ? `${money(r.cents)} ${r.cash ? "en efectivo" : "por Mercado Pago"}${r.pending ? " (en proceso)" : ""}`
      : null,
    r.giftcardCents > 0 ? `${money(r.giftcardCents)} a la gift card` : null,
    r.restocked ? "prendas al stock" : null,
    r.reason ? `"${r.reason}"` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
