import type { OrderStatus, PaymentMethod } from "@mini-galu/contracts";
import { and, type Db, desc, eq, gte, inArray, lt, not, or, schema as s, sql } from "@mini-galu/db";
import type { CartReservations } from "../../cart/application/ports";
import type {
  AdminOrderRepository,
  NewOrder,
  OrderEvent,
  OrderPayment,
  OrderRecord,
  OrderRepository,
  ReserveResult,
  Revocation,
  RevocationStore,
} from "../application/ports";
import type { PaidOrder } from "../domain/stats";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

class OutOfStock extends Error {
  constructor(readonly item: { productSlug: string; name: string; size: string; available: number }) {
    super("sin stock");
  }
}

/** También le dice a la bolsa cuánto stock tiene reservado en pedidos sin pagar (CartReservations). */
export class DrizzleOrderRepository implements OrderRepository, AdminOrderRepository, CartReservations {
  constructor(private readonly db: Db) {}

  async createReserving({ items, ...o }: NewOrder): Promise<ReserveResult> {
    try {
      return await this.db.transaction(async (tx) => {
        await this.take(tx, items);
        const [row] = await tx.insert(s.orders).values(o).returning({ id: s.orders.id, number: s.orders.number });
        const created = row as { id: string; number: number };
        if (items.length) await tx.insert(s.orderItems).values(items.map((i) => ({ ...i, orderId: created.id })));
        return { ok: true as const, ...created };
      });
    } catch (e) {
      if (e instanceof OutOfStock) return { ok: false, ...e.item };
      throw e;
    }
  }

  async findById(id: string) {
    return this.load(eq(s.orders.id, id));
  }

  async addEvent(orderId: string, e: Omit<OrderEvent, "at">) {
    await this.db.insert(s.orderEvents).values({ orderId, ...e });
  }

  async events(orderId: string): Promise<OrderEvent[]> {
    const rows = await this.db
      .select()
      .from(s.orderEvents)
      .where(eq(s.orderEvents.orderId, orderId))
      .orderBy(desc(s.orderEvents.createdAt));
    return rows.map((r) => ({
      kind: r.kind,
      title: r.title,
      detail: r.detail,
      auto: r.auto,
      at: r.createdAt,
      toStatus: r.toStatus,
    }));
  }

  async listForBoard(): Promise<OrderRecord[]> {
    const rows = await this.db
      .select()
      .from(s.orders)
      .where(
        and(
          not(inArray(s.orders.status, ["cancelado", "reembolsado"])),
          // los checkouts web sin pagar son compras en curso (30 min): no son tarea del taller
          or(not(eq(s.orders.status, "esperando_pago")), not(eq(s.orders.channel, "web"))),
          // la compra de una gift card no se prepara ni se envía
          eq(s.orders.kind, "prendas"),
        ),
      )
      .orderBy(desc(s.orders.statusChangedAt))
      .limit(500);
    if (!rows.length) return [];
    const items = await this.db
      .select()
      .from(s.orderItems)
      .where(
        inArray(
          s.orderItems.orderId,
          rows.map((r) => r.id),
        ),
      );
    const tracking = await this.trackingOf(rows.map((r) => r.id));
    const revoked = await this.revocationsOf(rows.map((r) => r.id));
    return rows.map((o) => ({
      ...o,
      trackingNumber: tracking.get(o.id) ?? null,
      revocation: revoked.get(o.id) ?? null,
      items: items.filter((i) => i.orderId === o.id).map(({ id: _id, orderId: _o, ...i }) => i),
    }));
  }

  async approvedPayment(orderId: string): Promise<OrderPayment | null> {
    const [p] = await this.db
      .select()
      .from(s.payments)
      .where(and(eq(s.payments.orderId, orderId), inArray(s.payments.status, ["approved", "processed", "refunded"])))
      .orderBy(desc(s.payments.updatedAt))
      .limit(1);
    if (!p) return null;
    // API de Orders: total_paid_amount · API de Payments: transaction_details.total_paid_amount
    const raw = p.raw as { total_paid_amount?: string | number; transaction_details?: { total_paid_amount?: number } };
    const paid = Number(raw?.total_paid_amount ?? raw?.transaction_details?.total_paid_amount);
    return {
      provider: p.provider,
      reference: p.providerPaymentId,
      status: p.status,
      paidByCustomerCents: Number.isFinite(paid) && paid > 0 ? Math.round(paid * 100) : null,
    };
  }

  async setStatus(id: string, from: OrderStatus, to: OrderStatus, at: Date) {
    const [row] = await this.db
      .update(s.orders)
      .set({ status: to, statusChangedAt: at })
      .where(and(eq(s.orders.id, id), eq(s.orders.status, from)))
      .returning({ id: s.orders.id });
    return !!row;
  }

  async markRefunded(id: string, from: OrderStatus, at: Date, restock: boolean) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(s.orders)
        .set({ status: "reembolsado", statusChangedAt: at })
        .where(and(eq(s.orders.id, id), eq(s.orders.status, from)))
        .returning({ id: s.orders.id });
      if (!row) return false;
      if (!restock) return true;
      const items = await this.itemsOf(tx, id);
      for (const i of items)
        if (i.variantId)
          await tx
            .update(s.variants)
            .set({ stock: sql`${s.variants.stock} + ${i.qty}` })
            .where(eq(s.variants.id, i.variantId));
      const sold = new Map<string, number>();
      for (const i of items) sold.set(i.productSlug, (sold.get(i.productSlug) ?? 0) + i.qty);
      for (const [slug, qty] of sold)
        await tx
          .update(s.products)
          .set({ unitsSold: sql`greatest(${s.products.unitsSold} - ${qty}, 0)` })
          .where(eq(s.products.slug, slug));
      return true;
    });
  }

  async setNote(id: string, note: string | null) {
    await this.db.update(s.orders).set({ internalNote: note }).where(eq(s.orders.id, id));
  }

  async findByNumber(number: number) {
    return this.load(eq(s.orders.number, number));
  }

  async paidSince(since: Date): Promise<PaidOrder[]> {
    const rows = await this.db
      .select({ totalCents: s.orders.totalCents, paidAt: s.orders.paidAt, email: s.orders.email })
      .from(s.orders)
      .where(and(gte(s.orders.paidAt, since), not(inArray(s.orders.status, ["cancelado", "reembolsado"]))));
    return rows.flatMap((r) => (r.paidAt ? [{ ...r, paidAt: r.paidAt }] : []));
  }

  async buyersBefore(before: Date, emails: string[]) {
    if (!emails.length) return new Set<string>();
    const rows = await this.db
      .selectDistinct({ email: s.orders.email })
      .from(s.orders)
      .where(
        and(
          inArray(s.orders.email, emails),
          lt(s.orders.paidAt, before),
          not(inArray(s.orders.status, ["cancelado", "reembolsado"])),
        ),
      );
    return new Set(rows.map((r) => r.email));
  }

  async recentAutoEvents(limit: number) {
    const rows = await this.db
      .select({
        kind: s.orderEvents.kind,
        title: s.orderEvents.title,
        detail: s.orderEvents.detail,
        auto: s.orderEvents.auto,
        at: s.orderEvents.createdAt,
        orderNumber: s.orders.number,
        firstName: s.orders.firstName,
        lastName: s.orders.lastName,
      })
      .from(s.orderEvents)
      .innerJoin(s.orders, eq(s.orders.id, s.orderEvents.orderId))
      .where(and(eq(s.orderEvents.auto, true), not(inArray(s.orderEvents.kind, ["created", "expired"]))))
      .orderBy(desc(s.orderEvents.createdAt))
      .limit(limit);
    return rows.map(({ firstName, lastName, ...r }) => ({ ...r, customer: `${firstName} ${lastName}`.trim() }));
  }

  async pendingForCart(cartId: string) {
    const rows = await this.db
      .select({ id: s.orders.id })
      .from(s.orders)
      .where(and(eq(s.orders.cartId, cartId), eq(s.orders.status, "esperando_pago")));
    return rows.map((r) => r.id);
  }

  async heldBy(cartId: string) {
    const rows = await this.db
      .select({ variantId: s.orderItems.variantId, qty: sql<number>`sum(${s.orderItems.qty})::int` })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(and(eq(s.orders.cartId, cartId), eq(s.orders.status, "esperando_pago")))
      .groupBy(s.orderItems.variantId);
    return new Map(rows.flatMap((r) => (r.variantId ? [[r.variantId, r.qty] as const] : [])));
  }

  async linksToRemind(createdBefore: Date) {
    const rows = await this.db
      .select({ id: s.orders.id })
      .from(s.orders)
      .where(
        and(
          eq(s.orders.status, "esperando_pago"),
          not(eq(s.orders.channel, "web")),
          lt(s.orders.createdAt, createdBefore),
          sql`not exists (select 1 from ${s.orderEvents} where ${s.orderEvents.orderId} = ${s.orders.id} and ${s.orderEvents.kind} = 'reminder')`,
        ),
      );
    const found = await Promise.all(rows.map((r) => this.findById(r.id)));
    return found.flatMap((o) => (o ? [o] : []));
  }

  async expired(now: Date) {
    const rows = await this.db
      .select({ id: s.orders.id })
      .from(s.orders)
      .where(and(eq(s.orders.status, "esperando_pago"), lt(s.orders.reservedUntil, now)));
    return rows.map((r) => r.id);
  }

  async cancelReleasing(id: string, reason: string, at: Date) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(s.orders)
        .set({ status: "cancelado", statusChangedAt: at, cancelledAt: at, cancelReason: reason, reservedUntil: null })
        .where(and(eq(s.orders.id, id), eq(s.orders.status, "esperando_pago")))
        .returning({ id: s.orders.id });
      if (!row) return false;
      for (const i of await this.itemsOf(tx, id))
        if (i.variantId)
          await tx
            .update(s.variants)
            .set({ stock: sql`${s.variants.stock} + ${i.qty}` })
            .where(eq(s.variants.id, i.variantId));
      return true;
    });
  }

  async updateTotals(
    id: string,
    t: {
      discountCents: number;
      shippingCents: number;
      giftcardCents: number;
      totalCents: number;
      couponId: string | null;
      couponCode: string | null;
    },
  ) {
    const [row] = await this.db
      .update(s.orders)
      .set(t)
      .where(and(eq(s.orders.id, id), eq(s.orders.status, "esperando_pago")))
      .returning({ id: s.orders.id });
    return !!row;
  }

  async markPaid(id: string, p: { method: PaymentMethod | null; installments: number | null; at: Date }) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(s.orders)
        .set({
          status: "nuevo",
          statusChangedAt: p.at,
          paidAt: p.at,
          paymentMethod: p.method,
          installments: p.installments,
          reservedUntil: null,
        })
        .where(and(eq(s.orders.id, id), eq(s.orders.status, "esperando_pago")))
        .returning({ id: s.orders.id });
      if (!row) return false;
      const sold = new Map<string, number>();
      for (const i of await this.itemsOf(tx, id)) sold.set(i.productSlug, (sold.get(i.productSlug) ?? 0) + i.qty);
      for (const [slug, qty] of sold)
        await tx
          .update(s.products)
          .set({ unitsSold: sql`${s.products.unitsSold} + ${qty}` })
          .where(eq(s.products.slug, slug));
      return true;
    });
  }

  async reReserve(id: string) {
    try {
      return await this.db.transaction(async (tx) => {
        const items = await this.itemsOf(tx, id);
        if (items.some((i) => !i.variantId)) return false;
        await this.take(
          tx,
          items.map((i) => ({ ...i, variantId: i.variantId as string })),
        );
        const [row] = await tx
          .update(s.orders)
          .set({ status: "esperando_pago", cancelledAt: null, cancelReason: null })
          .where(and(eq(s.orders.id, id), eq(s.orders.status, "cancelado")))
          .returning({ id: s.orders.id });
        if (!row) throw new OutOfStock({ productSlug: "", name: "", size: "", available: 0 });
        return true;
      });
    } catch (e) {
      if (e instanceof OutOfStock) return false;
      throw e;
    }
  }

  /** Descuenta stock talle por talle; si alguno no alcanza, corta la transacción. */
  private async take(
    tx: Tx,
    items: { variantId: string; qty: number; productSlug: string; name: string; size: string }[],
  ) {
    for (const i of items) {
      const [ok] = await tx
        .update(s.variants)
        .set({ stock: sql`${s.variants.stock} - ${i.qty}` })
        .where(and(eq(s.variants.id, i.variantId), gte(s.variants.stock, i.qty)))
        .returning({ id: s.variants.id });
      if (!ok) {
        const [v] = await tx.select({ stock: s.variants.stock }).from(s.variants).where(eq(s.variants.id, i.variantId));
        throw new OutOfStock({ productSlug: i.productSlug, name: i.name, size: i.size, available: v?.stock ?? 0 });
      }
    }
  }

  private itemsOf(db: Tx | Db, orderId: string) {
    return db.select().from(s.orderItems).where(eq(s.orderItems.orderId, orderId));
  }

  private async load(where: ReturnType<typeof eq>): Promise<OrderRecord | null> {
    const [o] = await this.db.select().from(s.orders).where(where);
    if (!o) return null;
    const items = await this.itemsOf(this.db, o.id);
    return {
      ...o,
      trackingNumber: (await this.trackingOf([o.id])).get(o.id) ?? null,
      revocation: (await this.revocationsOf([o.id])).get(o.id) ?? null,
      items: items.map(({ id: _id, orderId: _o, ...i }) => i),
    };
  }

  /** Número de seguimiento de cada pedido que ya tiene envío. */
  private async trackingOf(orderIds: string[]): Promise<Map<string, string>> {
    if (!orderIds.length) return new Map();
    const rows = await this.db
      .select({ orderId: s.shipments.orderId, trackingNumber: s.shipments.trackingNumber })
      .from(s.shipments)
      .where(inArray(s.shipments.orderId, orderIds));
    return new Map(rows.map((r) => [r.orderId, r.trackingNumber]));
  }

  /** Bajas pedidas con el botón de arrepentimiento. */
  private async revocationsOf(orderIds: string[]): Promise<Map<string, Revocation>> {
    if (!orderIds.length) return new Map();
    const rows = await this.db.select().from(s.orderRevocations).where(inArray(s.orderRevocations.orderId, orderIds));
    return new Map(rows.map((r) => [r.orderId, toRevocation(r)]));
  }
}

const toRevocation = (r: typeof s.orderRevocations.$inferSelect): Revocation => ({
  code: r.code,
  at: r.createdAt,
  inTime: r.inTime,
  reason: r.reason,
});

/** Solicitudes del botón de arrepentimiento (una por pedido). */
export class DrizzleRevocations implements RevocationStore {
  constructor(private readonly db: Db) {}

  async forOrder(orderId: string) {
    const [r] = await this.db.select().from(s.orderRevocations).where(eq(s.orderRevocations.orderId, orderId));
    return r ? toRevocation(r) : null;
  }

  async save(orderId: string, r: Omit<Revocation, "at">) {
    const [row] = await this.db
      .insert(s.orderRevocations)
      .values({ orderId, ...r })
      .onConflictDoNothing({ target: s.orderRevocations.orderId })
      .returning();
    if (row) return { created: true, revocation: toRevocation(row) };
    const had = await this.forOrder(orderId);
    if (!had) throw new Error("No se pudo guardar la solicitud de arrepentimiento");
    return { created: false, revocation: had };
  }
}
