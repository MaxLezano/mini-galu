import type { PaymentMethod } from "@mini-galu/contracts";
import type { CartReservations } from "../../cart/application/ports";
import type { MemoryVariants } from "../../cart/testing/in-memory";
import type { NewOrder, OrderRecord, OrderRepository } from "../application/ports";

/** Pedidos en memoria que descuentan y devuelven el stock de MemoryVariants. */
export class MemoryOrders implements OrderRepository, CartReservations {
  items: OrderRecord[] = [];
  unitsSold = new Map<string, number>();
  private seq = 1001;

  constructor(private readonly variants: MemoryVariants) {}

  async createReserving(o: NewOrder) {
    for (const i of o.items) {
      const v = this.variants.list.find((x) => x.variantId === i.variantId);
      if (!v || v.stock < i.qty)
        return { ok: false as const, productSlug: i.productSlug, name: i.name, size: i.size, available: v?.stock ?? 0 };
    }
    this.move(o.items, -1);
    const id = `o${this.seq}`;
    const number = this.seq++;
    this.items.push({
      ...o,
      id,
      number,
      status: "esperando_pago",
      paymentMethod: null,
      installments: null,
      paidAt: null,
      createdAt: new Date(),
    });
    return { ok: true as const, id, number };
  }
  async findById(id: string) {
    return this.items.find((o) => o.id === id) ?? null;
  }
  async findByNumber(n: number) {
    return this.items.find((o) => o.number === n) ?? null;
  }
  async pendingForCart(cartId: string) {
    return this.items.filter((o) => o.cartId === cartId && o.status === "esperando_pago").map((o) => o.id);
  }
  async heldBy(cartId: string) {
    const held = new Map<string, number>();
    for (const o of this.items)
      if (o.cartId === cartId && o.status === "esperando_pago")
        for (const i of o.items) if (i.variantId) held.set(i.variantId, (held.get(i.variantId) ?? 0) + i.qty);
    return held;
  }
  async expired(now: Date) {
    return this.items
      .filter((o) => o.status === "esperando_pago" && o.reservedUntil && o.reservedUntil < now)
      .map((o) => o.id);
  }
  async cancelReleasing(id: string) {
    const o = this.items.find((x) => x.id === id);
    if (o?.status !== "esperando_pago") return false;
    o.status = "cancelado";
    this.move(o.items, +1);
    return true;
  }
  async updateTotals(
    id: string,
    t: {
      discountCents: number;
      shippingCents: number;
      totalCents: number;
      couponId: string | null;
      couponCode: string | null;
    },
  ) {
    const o = this.items.find((x) => x.id === id);
    if (o?.status !== "esperando_pago") return false;
    Object.assign(o, t);
    return true;
  }
  async markPaid(id: string, p: { method: PaymentMethod | null; installments: number | null; at: Date }) {
    const o = this.items.find((x) => x.id === id);
    if (o?.status !== "esperando_pago") return false;
    Object.assign(o, { status: "nuevo", paidAt: p.at, paymentMethod: p.method, installments: p.installments });
    o.reservedUntil = null;
    for (const i of o.items) this.unitsSold.set(i.productSlug, (this.unitsSold.get(i.productSlug) ?? 0) + i.qty);
    return true;
  }
  async reReserve(id: string) {
    const o = this.items.find((x) => x.id === id);
    if (!o) return false;
    const short = o.items.some(
      (i) => (this.variants.list.find((v) => v.variantId === i.variantId)?.stock ?? 0) < i.qty,
    );
    if (short) return false;
    this.move(o.items, -1);
    o.status = "esperando_pago";
    return true;
  }
  private move(items: { variantId: string | null; qty: number }[], sign: 1 | -1) {
    for (const i of items) {
      const v = this.variants.list.find((x) => x.variantId === i.variantId);
      if (v) v.stock += sign * i.qty;
    }
  }
}
