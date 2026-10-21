import type { ReviewPoints } from "@mini-galu/contracts";

/** El mail del pedido de una reseña y si trajo foto (null: reseña demo o sin pedido). */
export type ReviewOwner = { email: string; hasPhoto: boolean };

export type IssuedCoupon = { code: string; percent: number; endsAt: Date; used: boolean };

export interface PointsRepository {
  reviewOwner(reviewId: string): Promise<ReviewOwner | null>;
  /** false si esa reseña ya había sumado (una vez por reseña). */
  earn(email: string, points: number, reviewId: string): Promise<boolean>;
  balance(email: string): Promise<number>;
  /**
   * Resta los puntos si alcanzan, sin que dos canjes a la vez gasten el mismo saldo. Devuelve el id del movimiento
   * (para atarle el cupón) o null si no alcanzan.
   */
  spend(email: string, points: number): Promise<string | null>;
  /** Devuelve los puntos de un canje que no llegó a dar cupón. */
  undo(entryId: string): Promise<void>;
  attachCoupon(entryId: string, couponId: string): Promise<void>;
  /** Los cupones de sus canjes, los más nuevos primero. */
  coupons(email: string): Promise<IssuedCoupon[]>;
}

/** Los cupones personales (los arma el módulo de cupones). */
export interface PointsCoupons {
  issue(p: { email: string; percent: number; days: number }): Promise<{ id: string; code: string }>;
}

/** Las reglas que Gaby edita en "Tienda y pagos". */
export type PointsRules = () => Promise<ReviewPoints>;
