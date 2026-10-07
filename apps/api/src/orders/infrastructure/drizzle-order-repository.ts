import type { PaymentMethod } from "@mini-galu/contracts";
import { and, type Db, eq, gte, lt, schema as s, sql } from "@mini-galu/db";
import type { CartReservations } from "../../cart/application/ports";
import type { NewOrder, OrderRecord, OrderRepository, ReserveResult } from "../application/ports";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

class OutOfStock extends Error {
  constructor(readonly item: { productSlug: string; name: string; size: string; available: number }) {
    super("sin stock");
  }
}

/** También le dice a la bolsa cuánto stock tiene reservado en pedidos sin pagar (CartReservations). */
export class DrizzleOrderRepository implements OrderRepository, CartReservations {
  constructor(private readonly db: Db) {}

  async createReserving({ items, ...o }: NewOrder): Promise<ReserveResult> {
    try {
      return await this.db.transaction(async (tx) => {
        await this.take(tx, items);
        const [row] = await tx.insert(s.orders).values(o).returning({ id: s.orders.id, number: s.orders.number });
        const created = row as { id: string; number: number };
        await tx.insert(s.orderItems).values(items.map((i) => ({ ...i, orderId: created.id })));
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

  async findByNumber(number: number) {
    return this.load(eq(s.orders.number, number));
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
        .set({ status: "cancelado", cancelledAt: at, cancelReason: reason, reservedUntil: null })
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

  async markPaid(id: string, p: { method: PaymentMethod | null; installments: number | null; at: Date }) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(s.orders)
        .set({
          status: "nuevo",
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
      items: items.map(({ id: _id, orderId: _o, ...i }) => i),
    };
  }
}
