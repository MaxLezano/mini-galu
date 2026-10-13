import { PAYMENT_METHODS, type PaymentMethod } from "@mini-galu/contracts";
import type { CartService } from "../../cart/application/cart-service";
import type { CouponService } from "../../coupons/application/coupon-service";
import { ConflictError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { formatOrderNumber } from "../domain/order";
import { findOwned } from "./checkout-service";
import type { OrderRecord, OrderRepository } from "./ports";

export type Payable = { id: string; number: string; email: string; totalCents: number; title: string };

/**
 * Lo que el módulo de pagos puede hacer con un pedido: saber si se puede cobrar y avisar el resultado.
 * Pago aprobado → "nuevo", se vacía la bolsa, se usa el cupón y se publica PaymentApproved.
 */
export class OrderPayments {
  constructor(
    private readonly orders: OrderRepository,
    private readonly cart: CartService,
    private readonly coupons: CouponService,
    private readonly events: EventBus,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  async payable(number: string, token: string): Promise<Payable> {
    const o = await findOwned(this.orders, number, token);
    if (o.status !== "esperando_pago")
      throw new ConflictError(o.paidAt ? "Este pedido ya está pagado" : "Este pedido se canceló: volvé a la bolsa");
    if (o.reservedUntil && o.reservedUntil.getTime() < this.clock().getTime())
      throw new ConflictError("Se venció la reserva del pedido: volvé a intentarlo desde la bolsa");
    return toPayable(o);
  }

  /** El pedido (con número + token), en cualquier estado. */
  owned(number: string, token: string): Promise<OrderRecord> {
    return findOwned(this.orders, number, token);
  }

  async findById(id: string): Promise<OrderRecord | null> {
    return this.orders.findById(id);
  }

  /** Idempotente: Mercado Pago puede avisar el mismo pago varias veces. */
  async approved(orderId: string, payment: { method: PaymentMethod | null; installments: number | null }) {
    const o = await this.orders.findById(orderId);
    if (!o) return;
    const at = this.clock();
    if (o.status === "cancelado" && !o.paidAt) {
      // la reserva había vencido pero el pago llegó igual: si queda stock, se reserva de nuevo
      if (!(await this.orders.reReserve(o.id))) {
        await this.orders.addEvent(o.id, {
          kind: "refund_needed",
          title: "Pago aprobado sin stock: hay que reembolsar",
          detail: "La reserva había vencido y las prendas ya no estaban",
          auto: true,
        });
        await this.events.publish({
          type: "PaymentNeedsRefund",
          occurredAt: at,
          payload: { orderId: o.id, number: formatOrderNumber(o.number), reason: "sin stock al aprobarse el pago" },
        });
        return;
      }
    }
    if (!(await this.orders.markPaid(o.id, { ...payment, at }))) return;
    await this.orders.addEvent(o.id, {
      kind: "paid",
      title: "Pago aprobado por Mercado Pago",
      detail: [
        payment.method ? PAYMENT_METHODS[payment.method] : null,
        payment.installments && payment.installments > 1 ? `${payment.installments} cuotas` : null,
        "stock descontado",
      ]
        .filter(Boolean)
        .join(" · "),
      auto: true,
    });
    if (o.cartId) await this.cart.empty(o.cartId);
    if (o.couponId) await this.coupons.redeem(o.couponId, o.id, o.email);
    await this.events.publish({
      type: "PaymentApproved",
      occurredAt: at,
      payload: {
        orderId: o.id,
        number: formatOrderNumber(o.number),
        email: o.email,
        totalCents: o.totalCents,
        method: payment.method,
      },
    });
  }

  /** Libera el stock de los pedidos que no se pagaron a tiempo. */
  async releaseExpired(): Promise<number> {
    const now = this.clock();
    let n = 0;
    for (const id of await this.orders.expired(now)) {
      if (!(await this.orders.cancelReleasing(id, "No se pagó a tiempo", now))) continue;
      n++;
      await this.orders.addEvent(id, {
        kind: "expired",
        title: "Se venció la reserva sin pagar",
        detail: "El stock volvió a la tienda",
        auto: true,
      });
      await this.events.publish({ type: "OrderExpired", occurredAt: now, payload: { orderId: id } });
    }
    return n;
  }
}

function toPayable(o: OrderRecord): Payable {
  const units = o.items.reduce((a, i) => a + i.qty, 0);
  return {
    id: o.id,
    number: formatOrderNumber(o.number),
    email: o.email,
    totalCents: o.totalCents,
    title: `Mini Galú · Pedido ${formatOrderNumber(o.number)} (${units} ${units === 1 ? "prenda" : "prendas"})`,
  };
}
