import { and, type Db, eq, gte, inArray, lt, notInArray, schema as s, sql } from "@mini-galu/db";
import type { LaunchSales } from "../application/launch-ports";

export class DrizzleLaunchSales implements LaunchSales {
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
}
