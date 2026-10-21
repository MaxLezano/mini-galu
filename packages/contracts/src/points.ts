import type { ReviewPoints } from "./policies";

/* ------------------------------------------------------------------ puntos por reseñas (Mi cuenta y /resena) */

/** Un cupón que salió de canjear puntos: personal, de un solo uso. */
export type PointsCoupon = {
  code: string;
  /** "10% de descuento" */
  label: string;
  endsAt: string;
  used: boolean;
};

export type PointsSummary = {
  rules: ReviewPoints;
  balance: number;
  /** Los canjeados, los más nuevos primero. */
  coupons: PointsCoupon[];
};

/** "Cada reseña que publicamos te suma 10 puntos (20 con foto). Con 100 puntos tenés un 10% de descuento." */
export function pointsHint(r: ReviewPoints): string {
  const photo = r.perPhoto > 0 ? ` (${r.perReview + r.perPhoto} con foto)` : "";
  return `Cada reseña que publicamos te suma ${r.perReview} puntos${photo}. Con ${r.threshold} puntos tenés un ${r.percent}% de descuento.`;
}

/** Cuántos le faltan para el próximo canje (0 si ya puede canjear). */
export const pointsToGo = (r: ReviewPoints, balance: number) => Math.max(0, r.threshold - balance);
