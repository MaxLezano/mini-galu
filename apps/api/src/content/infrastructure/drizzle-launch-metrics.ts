import { and, type Db, eq, gte, inArray, lt, notInArray, schema as s, sql } from "@mini-galu/db";
import type { LaunchMetrics } from "../application/launch-ports";

export class DrizzleLaunchMetrics implements LaunchMetrics {
  constructor(private readonly db: Db) {}

  async unitsSold(slugs: string[], from: Date, to: Date) {
    if (!slugs.length) return 0;
    const [r] = await this.db
      .select({ n: sql<number>`coalesce(sum(${s.orderItems.qty}), 0)::int` })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(
        and(
          inArray(s.orderItems.productSlug, slugs),
          gte(s.orders.paidAt, from),
          lt(s.orders.paidAt, to),
          notInArray(s.orders.status, ["cancelado", "reembolsado"]),
        ),
      );
    return r?.n ?? 0;
  }

  async favorites(slugs: string[]) {
    if (!slugs.length) return 0;
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.favorites)
      .innerJoin(s.products, eq(s.products.id, s.favorites.productId))
      .where(inArray(s.products.slug, slugs));
    return r?.n ?? 0;
  }

  async visits(launchId: string) {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.launchVisits)
      .where(eq(s.launchVisits.launchId, launchId));
    return r?.n ?? 0;
  }
}
