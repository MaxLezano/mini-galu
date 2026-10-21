import type { CouponInputSchema } from "@mini-galu/contracts";
import type { z } from "zod";
import type { Coupon, CouponFacts } from "../domain/coupon";

export type CouponWrite = z.output<typeof CouponInputSchema>;

/** Cupón personal de un canje de puntos: porcentaje, un solo uso, con vencimiento. */
export type PersonalCoupon = { code: string; percent: number; email: string; endsAt: Date };

export interface CouponRepository {
  /** Los del panel: sin los personales de los canjes de puntos. */
  all(): Promise<Coupon[]>;
  findById(id: string): Promise<Coupon | null>;
  findByCode(code: string): Promise<Coupon | null>;
  create(c: CouponWrite): Promise<string>;
  /** null si el código ya existe. */
  createPersonal(c: PersonalCoupon): Promise<string | null>;
  update(id: string, c: CouponWrite): Promise<void>;
  setActive(id: string, active: boolean): Promise<void>;
  delete(id: string): Promise<void>;
  /** Registra el uso (una vez por pedido) y suma al contador. false si ese pedido ya lo había usado. */
  redeem(couponId: string, orderId: string, email: string): Promise<boolean>;
  facts(couponId: string, email: string): Promise<CouponFacts>;
}
