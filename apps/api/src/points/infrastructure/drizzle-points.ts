import { type Db, desc, eq, schema as s, sql } from "@mini-galu/db";
import type { PointsRepository } from "../application/ports";

export class DrizzlePoints implements PointsRepository {
  constructor(private readonly db: Db) {}

  async reviewOwner(reviewId: string) {
    const [r] = await this.db
      .select({ email: s.orders.email, photoPath: s.reviews.photoPath })
      .from(s.reviews)
      .innerJoin(s.orderItems, eq(s.orderItems.id, s.reviews.orderItemId))
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(eq(s.reviews.id, reviewId));
    return r ? { email: r.email.toLowerCase(), hasPhoto: !!r.photoPath } : null;
  }

  async earn(email: string, points: number, reviewId: string) {
    const r = await this.db
      .insert(s.pointsEntries)
      .values({ email, points, reviewId })
      .onConflictDoNothing()
      .returning({ id: s.pointsEntries.id });
    return r.length > 0;
  }

  async balance(email: string) {
    const [r] = await this.db
      .select({ n: sql<number>`coalesce(sum(${s.pointsEntries.points}), 0)::int` })
      .from(s.pointsEntries)
      .where(eq(s.pointsEntries.email, email));
    return r?.n ?? 0;
  }

  spend(email: string, points: number) {
    return this.db.transaction(async (tx) => {
      // un canje por mail a la vez: el segundo espera y ve el saldo ya descontado
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`puntos:${email}`}))`);
      const [b] = await tx
        .select({ n: sql<number>`coalesce(sum(${s.pointsEntries.points}), 0)::int` })
        .from(s.pointsEntries)
        .where(eq(s.pointsEntries.email, email));
      if ((b?.n ?? 0) < points) return null;
      const [r] = await tx
        .insert(s.pointsEntries)
        .values({ email, points: -points })
        .returning({ id: s.pointsEntries.id });
      return r?.id ?? null;
    });
  }

  async undo(entryId: string) {
    await this.db.delete(s.pointsEntries).where(eq(s.pointsEntries.id, entryId));
  }

  async attachCoupon(entryId: string, couponId: string) {
    await this.db.update(s.pointsEntries).set({ couponId }).where(eq(s.pointsEntries.id, entryId));
  }

  async coupons(email: string) {
    const rows = await this.db
      .select({
        code: s.coupons.code,
        percent: s.coupons.value,
        endsAt: s.coupons.endsAt,
        timesUsed: s.coupons.timesUsed,
      })
      .from(s.pointsEntries)
      .innerJoin(s.coupons, eq(s.coupons.id, s.pointsEntries.couponId))
      .where(eq(s.pointsEntries.email, email))
      .orderBy(desc(s.pointsEntries.createdAt));
    return rows.map((r) => ({
      code: r.code,
      percent: r.percent,
      endsAt: r.endsAt ?? new Date(0),
      used: r.timesUsed > 0,
    }));
  }
}
