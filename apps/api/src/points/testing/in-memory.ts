import type { IssuedCoupon, PointsCoupons, PointsRepository, ReviewOwner } from "../application/ports";

type Entry = { id: string; email: string; points: number; reviewId: string | null; couponId: string | null };

export class MemoryPoints implements PointsRepository {
  entries: Entry[] = [];
  owners = new Map<string, ReviewOwner>();
  issued = new Map<string, IssuedCoupon>();

  async reviewOwner(reviewId: string) {
    return this.owners.get(reviewId) ?? null;
  }
  async earn(email: string, points: number, reviewId: string) {
    if (this.entries.some((e) => e.reviewId === reviewId)) return false;
    this.entries.push({ id: `e${this.entries.length + 1}`, email, points, reviewId, couponId: null });
    return true;
  }
  async balance(email: string) {
    return this.entries.filter((e) => e.email === email).reduce((n, e) => n + e.points, 0);
  }
  async spend(email: string, points: number) {
    if ((await this.balance(email)) < points) return null;
    const id = `e${this.entries.length + 1}`;
    this.entries.push({ id, email, points: -points, reviewId: null, couponId: null });
    return id;
  }
  async undo(entryId: string) {
    this.entries = this.entries.filter((e) => e.id !== entryId);
  }
  async attachCoupon(entryId: string, couponId: string) {
    const e = this.entries.find((x) => x.id === entryId);
    if (e) e.couponId = couponId;
  }
  async coupons(email: string) {
    return this.entries
      .filter((e) => e.email === email && e.couponId)
      .reverse()
      .map((e) => this.issued.get(e.couponId as string) as IssuedCoupon);
  }
}

export class MemoryPointsCoupons implements PointsCoupons {
  fail = false;
  constructor(private readonly repo: MemoryPoints) {}
  async issue(p: { email: string; percent: number; days: number }) {
    if (this.fail) throw new Error("sin cupón");
    const id = `cp${this.repo.issued.size + 1}`;
    const code = `PUNTOS-${this.repo.issued.size + 1}`;
    this.repo.issued.set(id, { code, percent: p.percent, endsAt: new Date(p.days * 86_400_000), used: false });
    return { id, code };
  }
}
