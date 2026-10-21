import { randomInt } from "node:crypto";
import { type AdminCoupon, couponLabel, formatARS } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import { type Coupon, type CouponResult, evaluateCoupon, NO_FACTS, normalizeCode } from "../domain/coupon";
import type { CouponRepository, CouponWrite } from "./ports";

export type CouponCheck = { coupon: Coupon; label: string; result: CouponResult } | { coupon: null; reason: string };

export class CouponService {
  constructor(
    private readonly repo: CouponRepository,
    private readonly clock: () => Date = () => new Date(),
    private readonly random: () => string = randomCode,
  ) {}

  /* --------------------------------------------------------------- checkout */

  async check(code: string, subtotalCents: number, email: string | null): Promise<CouponCheck> {
    const coupon = await this.repo.findByCode(normalizeCode(code));
    if (!coupon) return { coupon: null, reason: "Ese código no existe" };
    const facts = email ? await this.repo.facts(coupon.id, email) : NO_FACTS;
    return {
      coupon,
      label: `${coupon.code} · ${couponLabel(coupon, formatARS)}`,
      result: evaluateCoupon(coupon, { subtotalCents, now: this.clock(), email, facts }),
    };
  }

  /** El cupón "Mail de cumpleaños" vigente (el más nuevo), para sumarlo al aviso del cumple. */
  async birthdayCoupon(): Promise<{ code: string; label: string } | null> {
    const now = this.clock().getTime();
    const c = (await this.repo.all())
      .filter(
        (c) =>
          c.audience === "cumple" &&
          c.active &&
          (!c.endsAt || c.endsAt.getTime() > now) &&
          (c.maxUses === null || c.timesUsed < c.maxUses),
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    if (!c) return null;
    return {
      code: c.code,
      label: c.kind === "free_shipping" ? "envío gratis" : `${couponLabel(c, formatARS)} de descuento`,
    };
  }

  /** Canje de puntos: un cupón de un solo uso que vale solo con ese mail ("PUNTOS-7K2QX"). */
  async issuePersonal(p: { email: string; percent: number; days: number }): Promise<{ id: string; code: string }> {
    const endsAt = new Date(this.clock().getTime() + p.days * 86_400_000);
    for (let i = 0; i < 5; i++) {
      const code = `PUNTOS-${this.random()}`;
      const id = await this.repo.createPersonal({ code, percent: p.percent, email: p.email, endsAt });
      if (id) return { id, code };
    }
    throw new ConflictError("No pudimos generar el cupón, probá de nuevo");
  }

  /** Al aprobarse el pago. Idempotente por pedido. */
  redeem(couponId: string, orderId: string, email: string) {
    return this.repo.redeem(couponId, orderId, email);
  }

  /* --------------------------------------------------------------- panel */

  async list(): Promise<AdminCoupon[]> {
    return (await this.repo.all()).map(toAdmin);
  }

  async create(data: CouponWrite): Promise<AdminCoupon> {
    if (await this.repo.findByCode(data.code)) throw new ConflictError("Ya existe un cupón con ese código");
    return this.get(await this.repo.create(data));
  }

  async update(id: string, data: CouponWrite): Promise<AdminCoupon> {
    await this.get(id);
    const same = await this.repo.findByCode(data.code);
    if (same && same.id !== id) throw new ConflictError("Ya existe un cupón con ese código");
    await this.repo.update(id, data);
    return this.get(id);
  }

  async setActive(id: string, active: boolean): Promise<AdminCoupon> {
    await this.get(id);
    await this.repo.setActive(id, active);
    return this.get(id);
  }

  async remove(id: string): Promise<void> {
    await this.get(id);
    await this.repo.delete(id);
  }

  private async get(id: string) {
    const c = await this.repo.findById(id);
    if (!c) throw new NotFoundError("Cupón inexistente");
    return toAdmin(c);
  }
}

/** Sin letras que se confunden (0/O, 1/I). */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
function randomCode() {
  return Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}

function toAdmin(c: Coupon): AdminCoupon {
  return {
    id: c.id,
    code: c.code,
    kind: c.kind,
    value: c.value,
    minSubtotalCents: c.minSubtotalCents,
    audience: c.audience,
    endsAt: c.endsAt?.toISOString() ?? null,
    maxUses: c.maxUses,
    oncePerCustomer: c.oncePerCustomer,
    active: c.active,
    timesUsed: c.timesUsed,
    createdAt: c.createdAt.toISOString(),
  };
}
