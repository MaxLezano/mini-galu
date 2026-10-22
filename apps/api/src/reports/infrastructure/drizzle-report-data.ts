import { and, type Db, eq, gte, inArray, isNull, lt, not, schema as s, sql } from "@mini-galu/db";
import type { ReportData } from "../application/ports";
import type { ReportOrder } from "../domain/monthly-report";

const LOST = ["cancelado", "reembolsado"] as const;

export class DrizzleReportData implements ReportData {
  constructor(private readonly db: Db) {}

  async paidBetween(from: Date, to: Date): Promise<ReportOrder[]> {
    const orders = await this.db
      .select({
        id: s.orders.id,
        // sin lo que volvió en devoluciones parciales
        totalCents: sql<number>`${s.orders.totalCents} - ${s.orders.refundedCents}`.mapWith(Number),
        paidAt: s.orders.paidAt,
        email: s.orders.email,
        channel: s.orders.channel,
      })
      .from(s.orders)
      .where(and(gte(s.orders.paidAt, from), lt(s.orders.paidAt, to), not(inArray(s.orders.status, [...LOST]))));
    if (!orders.length) return [];
    const items = await this.db
      .select({
        orderId: s.orderItems.orderId,
        slug: s.orderItems.productSlug,
        name: s.orderItems.name,
        size: s.orderItems.size,
        qty: s.orderItems.qty,
        returnedQty: s.orderItems.returnedQty,
        unitPriceCents: s.orderItems.unitPriceCents,
      })
      .from(s.orderItems)
      .where(
        inArray(
          s.orderItems.orderId,
          orders.map((o) => o.id),
        ),
      );
    return orders.flatMap(({ id, paidAt, ...o }) =>
      paidAt
        ? [
            {
              ...o,
              paidAt,
              items: items
                .filter((i) => i.orderId === id)
                .map((i) => {
                  const units = i.qty - i.returnedQty;
                  return { slug: i.slug, name: i.name, size: i.size, units, cents: units * i.unitPriceCents };
                }),
            },
          ]
        : [],
    );
  }

  async buyersBefore(before: Date, emails: string[]) {
    if (!emails.length) return new Set<string>();
    const rows = await this.db
      .selectDistinct({ email: s.orders.email })
      .from(s.orders)
      .where(
        and(inArray(s.orders.email, emails), lt(s.orders.paidAt, before), not(inArray(s.orders.status, [...LOST]))),
      );
    return new Set(rows.map((r) => r.email));
  }

  async soldOut() {
    const waiting = this.db
      .select({
        productId: s.waitlistEntries.productId,
        size: s.waitlistEntries.size,
        n: sql<number>`count(*)::int`.as("n"),
      })
      .from(s.waitlistEntries)
      .where(isNull(s.waitlistEntries.notifiedAt))
      .groupBy(s.waitlistEntries.productId, s.waitlistEntries.size)
      .as("waiting");
    const rows = await this.db
      .select({
        slug: s.products.slug,
        name: s.products.name,
        size: s.variants.size,
        waiting: sql<number>`coalesce(${waiting.n}, 0)`.mapWith(Number),
      })
      .from(s.variants)
      .innerJoin(s.products, eq(s.products.id, s.variants.productId))
      .leftJoin(waiting, and(eq(waiting.productId, s.variants.productId), eq(waiting.size, s.variants.size)))
      .where(and(eq(s.variants.stock, 0), eq(s.products.status, "published")))
      .orderBy(s.products.name, s.variants.position);
    return rows;
  }
}
