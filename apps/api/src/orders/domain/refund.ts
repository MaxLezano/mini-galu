import {
  type AdminRefund,
  type AdminReturn,
  type OrderStatus,
  type PaymentMethod,
  type ReturnBase,
  returnAmounts,
} from "@mini-galu/contracts";
import { PAID_STATUSES } from "./order";

/** Todavía en el taller: si se reintegra, lo normal es que las prendas vuelvan al stock. */
export const NOT_SHIPPED: readonly OrderStatus[] = ["nuevo", "preparando", "listo"];

export type RefundableOrder = {
  status: OrderStatus;
  kind: "prendas" | "giftcard";
  paidAt: Date | null;
  totalCents: number;
  giftcardCents: number;
  /** Lo que ya volvió en devoluciones parciales. */
  refundedCents: number;
  giftcardRefundedCents: number;
  paymentMethod: PaymentMethod | null;
};

/**
 * Qué se devuelve si el taller reintegra el pedido: el total o, después de devoluciones parciales, lo que queda.
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
  const cents = o.totalCents - o.refundedCents;
  return {
    cents,
    cash,
    giftcardCents: prendas ? o.giftcardCents - o.giftcardRefundedCents : 0,
    restock: prendas,
    restockSuggested: prendas && NOT_SHIPPED.includes(o.status),
    blocked: noPayment(cents, hasPayment, cash),
  };
}

// pedidos cargados a mano o pagados antes de guardar los pagos: no hay a qué operación devolverle
const noPayment = (cents: number, hasPayment: boolean, cash: boolean) =>
  cents > 0 && !hasPayment && !cash
    ? "No está el pago de Mercado Pago de este pedido: reintegralo desde la cuenta de Mercado Pago"
    : null;

type ReturnableItem = {
  id: string;
  name: string;
  size: string;
  qty: number;
  returnedQty: number;
  unitPriceCents: number;
};
export type ReturnableOrder = RefundableOrder & { discountCents: number; items: ReturnableItem[] };

const returnBase = (o: ReturnableOrder): ReturnBase => ({
  itemsCents: o.items.reduce((a, i) => a + i.unitPriceCents * i.qty, 0),
  discountCents: o.discountCents,
  totalCents: o.totalCents,
  giftcardCents: o.giftcardCents,
  refundedCents: o.refundedCents,
  giftcardRefundedCents: o.giftcardRefundedCents,
});

/**
 * Devolver algunas prendas: solo de un pedido de prendas pagado al que le queden prendas sin devolver (null si no).
 * El cliente las manda de vuelta y se le devuelve su parte; el envío queda para el reintegro total.
 */
export function returnPlan(o: ReturnableOrder, hasPayment: boolean): AdminReturn | null {
  if (o.kind !== "prendas" || !PAID_STATUSES.includes(o.status)) return null;
  if (!o.items.some((i) => i.qty > i.returnedQty)) return null;
  const cash = o.paymentMethod === "efectivo";
  return {
    ...returnBase(o),
    cash,
    restockSuggested: NOT_SHIPPED.includes(o.status),
    blocked: noPayment(o.totalCents - o.refundedCents, hasPayment, cash),
  };
}

export type ReturnPick = { itemId: string; qty: number };
export type ReturnedLine = { description: string; qty: number; unitCents: number; totalCents: number };

/** Lo que se devuelve por esas prendas (o por qué no se puede). */
export function returnQuote(
  o: ReturnableOrder,
  picks: ReturnPick[],
):
  | { error: string }
  | ({ items: (ReturnableItem & { take: number })[]; lines: ReturnedLine[] } & ReturnType<typeof returnAmounts>) {
  const items: (ReturnableItem & { take: number })[] = [];
  for (const p of picks) {
    const item = o.items.find((i) => i.id === p.itemId);
    if (!item || items.some((i) => i.id === p.itemId))
      return { error: "Esa prenda ya no está en el pedido: actualizá la página" };
    const left = item.qty - item.returnedQty;
    if (p.qty > left)
      return {
        error: left
          ? `Del ${item.name} talle ${item.size} quedan ${left} para devolver`
          : `El ${item.name} talle ${item.size} ya se devolvió`,
      };
    items.push({ ...item, take: p.qty });
  }
  if (!items.length) return { error: "Elegí qué prendas devuelve" };
  const amounts = returnAmounts(
    returnBase(o),
    items.reduce((a, i) => a + i.unitPriceCents * i.take, 0),
  );
  if (amounts.saleCents <= 0) return { error: "No queda nada para devolver de este pedido" };
  return {
    items,
    lines: creditLines(
      items.map((i) => ({ ...i, qty: i.take })),
      0,
      amounts.discountCents,
    ),
    ...amounts,
  };
}

/**
 * Renglones de la nota de crédito del reintegro total cuando antes hubo devoluciones parciales: las prendas que
 * quedan, el envío y el descuento que ajusta al total que queda (`saleCents`).
 */
export function remainingLines(o: ReturnableOrder & { shippingCents: number }, saleCents: number): ReturnedLine[] {
  const items = o.items.map((i) => ({ ...i, qty: i.qty - i.returnedQty })).filter((i) => i.qty > 0);
  const full = items.reduce((a, i) => a + i.unitPriceCents * i.qty, 0) + o.shippingCents;
  return creditLines(items, o.shippingCents, full - saleCents);
}

/** Renglones como los de la factura: cada prenda, el envío y el descuento en negativo. */
function creditLines(
  items: { name: string; size: string; qty: number; unitPriceCents: number }[],
  shippingCents: number,
  discountCents: number,
): ReturnedLine[] {
  const lines: ReturnedLine[] = items.map((i) => ({
    description: `${i.name} · talle ${i.size}`,
    qty: i.qty,
    unitCents: i.unitPriceCents,
    totalCents: i.unitPriceCents * i.qty,
  }));
  if (shippingCents > 0)
    lines.push({ description: "Envío", qty: 1, unitCents: shippingCents, totalCents: shippingCents });
  if (discountCents !== 0)
    lines.push({ description: "Descuento", qty: 1, unitCents: -discountCents, totalCents: -discountCents });
  return lines;
}

/**
 * Línea del historial: "$ 45.000 por Mercado Pago · $ 5.000 a la gift card · prendas al stock". En una devolución
 * parcial empieza por las prendas: "Maddie talle 4 (2) · Lola talle 6 · $ 30.000 por Mercado Pago…".
 */
export function refundDetail(
  r: {
    cents: number;
    cash: boolean;
    giftcardCents: number;
    restocked: boolean;
    pending: boolean;
    reason: string;
    items?: { name: string; size: string; qty: number }[];
  },
  money: (cents: number) => string,
): string {
  return [
    ...(r.items ?? []).map((i) => `${i.name} talle ${i.size}${i.qty > 1 ? ` (${i.qty})` : ""}`),
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
