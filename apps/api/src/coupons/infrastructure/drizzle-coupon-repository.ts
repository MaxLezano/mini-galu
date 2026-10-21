import { and, type Db, desc, eq, inArray, isNull, schema as s, sql } from "@mini-galu/db";
import type { CouponRepository, CouponWrite, PersonalCoupon } from "../application/ports";
import type { Coupon } from "../domain/coupon";

const PAID = ["nuevo", "preparando", "listo", "en_camino", "entregado"] as const;

export class DrizzleCouponRepository implements CouponRepository {
  constructor(private readonly db: Db) {}

  all(): Promise<Coupon[]> {
    return this.db.select().from(s.coupons).where(isNull(s.coupons.email)).orderBy(desc(s.coupons.createdAt));
  }

  async findById(id: string) {
    const [c] = await this.db.select().from(s.coupons).where(eq(s.coupons.id, id));
    return c ?? null;
  }

  async findByCode(code: string) {
    const [c] = await this.db.select().from(s.coupons).where(eq(s.coupons.code, code));
    return c ?? null;
  }

  async create(c: CouponWrite) {
    const [r] = await this.db.insert(s.coupons).values(this.columns(c)).returning({ id: s.coupons.id });
    return (r as { id: string }).id;
  }

  async createPersonal(c: PersonalCoupon) {
    const [r] = await this.db
      .insert(s.coupons)
      .values({ code: c.code, kind: "percent", value: c.percent, email: c.email, endsAt: c.endsAt, maxUses: 1 })
      .onConflictDoNothing()
      .returning({ id: s.coupons.id });
    return r?.id ?? null;
  }

  async update(id: string, c: CouponWrite) {
    await this.db.update(s.coupons).set(this.columns(c)).where(eq(s.coupons.id, id));
  }

  async setActive(id: string, active: boolean) {
    await this.db.update(s.coupons).set({ active }).where(eq(s.coupons.id, id));
  }

  async delete(id: string) {
    await this.db.delete(s.coupons).where(eq(s.coupons.id, id));
  }

  async redeem(couponId: string, orderId: string, email: string) {
    return this.db.transaction(async (tx) => {
      const [r] = await tx
        .insert(s.couponRedemptions)
        .values({ couponId, orderId, email })
        .onConflictDoNothing()
        .returning({ id: s.couponRedemptions.id });
      if (!r) return false;
      await tx
        .update(s.coupons)
        .set({ timesUsed: sql`${s.coupons.timesUsed} + 1` })
        .where(eq(s.coupons.id, couponId));
      return true;
    });
  }

  async facts(couponId: string, email: string) {
    const [used] = await this.db
      .select({ id: s.couponRedemptions.id })
      .from(s.couponRedemptions)
      .where(and(eq(s.couponRedemptions.couponId, couponId), eq(s.couponRedemptions.email, email)))
      .limit(1);
    const [paid] = await this.db
      .select({ id: s.orders.id })
      .from(s.orders)
      .where(and(eq(s.orders.email, email), inArray(s.orders.status, [...PAID])))
      .limit(1);
    const [signup] = await this.db
      .select({ id: s.launchSignups.id })
      .from(s.launchSignups)
      .where(and(eq(s.launchSignups.channel, "email"), sql`lower(${s.launchSignups.contact}) = ${email}`))
      .limit(1);
    // el cupón de cumple vale si le llegó el aviso "Se acerca un cumple" (15 días antes + 30 después)
    const [birthday] = await this.db
      .select({ id: s.automationRuns.id })
      .from(s.automationRuns)
      .where(
        and(
          eq(s.automationRuns.rule, "cumple"),
          eq(s.automationRuns.status, "ok"),
          sql`${s.automationRuns.contact} = lower(${email})`,
          sql`${s.automationRuns.createdAt} > now() - interval '45 days'`,
        ),
      )
      .limit(1);
    return { usedByEmail: !!used, hasPaidOrder: !!paid, isLaunchSignup: !!signup, gotBirthdayMail: !!birthday };
  }

  private columns(c: CouponWrite) {
    return { ...c, endsAt: c.endsAt ? new Date(c.endsAt) : null };
  }
}
