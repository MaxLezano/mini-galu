import type { PointsSummary } from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import { canRedeem, pointsForReview } from "../domain/points";
import type { PointsCoupons, PointsRepository, PointsRules } from "./ports";

/**
 * Puntos por reseñas: suman cuando Gaby publica la reseña (no al dejarla, así no se juntan con reseñas de relleno)
 * y se canjean por un cupón personal. Solo las reseñas suman; ocultarla después no los saca.
 * Cuando suman publica `PointsEarned` (el aviso al cliente lo mandan las automatizaciones).
 */
export class PointsService {
  constructor(
    private readonly repo: PointsRepository,
    private readonly coupons: PointsCoupons,
    private readonly rules: PointsRules,
    private readonly events?: Pick<EventBus, "publish">,
  ) {}

  /** Una reseña pasó a publicada. Idempotente: publicarla de nuevo no vuelve a sumar. */
  async reviewPublished(reviewId: string): Promise<number> {
    const rules = await this.rules();
    if (!rules.enabled) return 0;
    const owner = await this.repo.reviewOwner(reviewId);
    if (!owner) return 0;
    const points = pointsForReview(rules, owner.hasPhoto);
    if (!(await this.repo.earn(owner.email, points, reviewId))) return 0;
    const balance = await this.repo.balance(owner.email);
    await this.events?.publish({
      type: "PointsEarned",
      occurredAt: new Date(),
      payload: { reviewId, email: owner.email, points, balance },
    });
    return points;
  }

  async summary(email: string): Promise<PointsSummary> {
    const [rules, balance, coupons] = await Promise.all([
      this.rules(),
      this.repo.balance(email),
      this.repo.coupons(email),
    ]);
    return {
      rules,
      balance,
      coupons: coupons.map((c) => ({
        code: c.code,
        label: `${c.percent}% de descuento`,
        endsAt: c.endsAt.toISOString(),
        used: c.used,
      })),
    };
  }

  /** Canjea `threshold` puntos por un cupón del `percent`% que vale `validDays` días. */
  async redeem(email: string): Promise<PointsSummary> {
    const rules = await this.rules();
    if (!rules.enabled) throw new ValidationError("Por ahora no se pueden canjear puntos");
    if (!canRedeem(rules, await this.repo.balance(email)))
      throw new ValidationError(`Te faltan puntos: el canje es con ${rules.threshold}`);
    const entry = await this.repo.spend(email, rules.threshold);
    if (!entry) throw new ValidationError(`Te faltan puntos: el canje es con ${rules.threshold}`);
    try {
      const coupon = await this.coupons.issue({ email, percent: rules.percent, days: rules.validDays });
      await this.repo.attachCoupon(entry, coupon.id);
    } catch (e) {
      await this.repo.undo(entry);
      throw e;
    }
    return this.summary(email);
  }
}
