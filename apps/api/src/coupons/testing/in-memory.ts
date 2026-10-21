import type { CouponRepository, CouponWrite, PersonalCoupon } from "../application/ports";
import type { Coupon } from "../domain/coupon";

export class MemoryCoupons implements CouponRepository {
  items: Coupon[] = [];
  redemptions: { couponId: string; orderId: string; email: string }[] = [];
  paidEmails = new Set<string>();
  signups = new Set<string>();
  birthdayMails = new Set<string>();

  async all() {
    return this.items.filter((c) => c.email === null);
  }
  async findById(id: string) {
    return this.items.find((c) => c.id === id) ?? null;
  }
  async findByCode(code: string) {
    return this.items.find((c) => c.code === code) ?? null;
  }
  async create(c: CouponWrite) {
    const id = `cp${this.items.length + 1}`;
    this.items.push(this.toCoupon(id, c, 0));
    return id;
  }
  async createPersonal(c: PersonalCoupon) {
    if (this.items.some((x) => x.code === c.code)) return null;
    const id = `cp${this.items.length + 1}`;
    this.items.push({
      id,
      code: c.code,
      kind: "percent",
      value: c.percent,
      minSubtotalCents: null,
      audience: "todos",
      endsAt: c.endsAt,
      maxUses: 1,
      oncePerCustomer: true,
      active: true,
      timesUsed: 0,
      email: c.email,
      createdAt: new Date(),
    });
    return id;
  }
  async update(id: string, c: CouponWrite) {
    const i = this.items.findIndex((x) => x.id === id);
    this.items[i] = this.toCoupon(id, c, this.items[i]?.timesUsed ?? 0);
  }
  async setActive(id: string, active: boolean) {
    const c = this.items.find((x) => x.id === id);
    if (c) c.active = active;
  }
  async delete(id: string) {
    this.items = this.items.filter((c) => c.id !== id);
  }
  async redeem(couponId: string, orderId: string, email: string) {
    if (this.redemptions.some((r) => r.orderId === orderId)) return false;
    this.redemptions.push({ couponId, orderId, email });
    const c = this.items.find((x) => x.id === couponId);
    if (c) c.timesUsed++;
    return true;
  }
  async facts(couponId: string, email: string) {
    return {
      usedByEmail: this.redemptions.some((r) => r.couponId === couponId && r.email === email),
      hasPaidOrder: this.paidEmails.has(email),
      isLaunchSignup: this.signups.has(email),
      gotBirthdayMail: this.birthdayMails.has(email),
    };
  }
  private toCoupon(id: string, c: CouponWrite, timesUsed: number): Coupon {
    return { ...c, id, endsAt: c.endsAt ? new Date(c.endsAt) : null, timesUsed, email: null, createdAt: new Date() };
  }
}
