import type { OrderStatus, PaymentMethod } from "@mini-galu/contracts";
import type { CartReservations } from "../../cart/application/ports";
import type { MemoryVariants } from "../../cart/testing/in-memory";
import type {
  AdminOrderRepository,
  NewOrder,
  OrderEvent,
  OrderPayment,
  OrderRecord,
  OrderRepository,
} from "../application/ports";

/** Pedidos en memoria que descuentan y devuelven el stock de MemoryVariants. */
export class MemoryOrders implements OrderRepository, AdminOrderRepository, CartReservations {
  items: OrderRecord[] = [];
  log = new Map<string, OrderEvent[]>();
  payments = new Map<string, OrderPayment>();
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
      channel: o.channel ?? "web",
      statusChangedAt: new Date(),
      internalNote: null,
      status: "esperando_pago",
      paymentMethod: null,
      installments: null,
      paidAt: null,
      createdAt: new Date(),
    });
    return { ok: true as const, id, number };
  }
  async addEvent(orderId: string, e: Omit<OrderEvent, "at">) {
    this.log.set(orderId, [...(this.log.get(orderId) ?? []), { ...e, at: new Date() }]);
  }
  async events(orderId: string) {
    return [...(this.log.get(orderId) ?? [])].reverse();
  }
  async listForBoard() {
    return this.items.filter(
      (o) =>
        !["cancelado", "reembolsado"].includes(o.status) && !(o.status === "esperando_pago" && o.channel === "web"),
    );
  }
  async approvedPayment(orderId: string) {
    return this.payments.get(orderId) ?? null;
  }
  async setStatus(id: string, from: OrderStatus, to: OrderStatus, at: Date) {
    const o = this.items.find((x) => x.id === id);
    if (o?.status !== from) return false;
    o.status = to;
    o.statusChangedAt = at;
    return true;
  }
  async setNote(id: string, note: string | null) {
    const o = this.items.find((x) => x.id === id);
    if (o) o.internalNote = note;
  }
  private paid = (o: OrderRecord) => !!o.paidAt && !["cancelado", "reembolsado"].includes(o.status);
  async paidSince(since: Date) {
    return this.items
      .filter((o) => this.paid(o) && (o.paidAt as Date) >= since)
      .map((o) => ({ totalCents: o.totalCents, paidAt: o.paidAt as Date, email: o.email }));
  }
  async buyersBefore(before: Date, emails: string[]) {
    return new Set(
      this.items
        .filter((o) => this.paid(o) && (o.paidAt as Date) < before && emails.includes(o.email))
        .map((o) => o.email),
    );
  }
  async recentAutoEvents(limit: number) {
    return this.items
      .flatMap((o) =>
        (this.log.get(o.id) ?? [])
          .filter((e) => e.auto && !["created", "expired"].includes(e.kind))
          .map((e) => ({ ...e, orderNumber: o.number, customer: `${o.firstName} ${o.lastName}`.trim() })),
      )
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, limit);
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
    Object.assign(o, {
      status: "nuevo",
      statusChangedAt: p.at,
      paidAt: p.at,
      paymentMethod: p.method,
      installments: p.installments,
    });
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
