import type { ReviewPoints } from "@mini-galu/contracts";

/** Lo que suma una reseña publicada: la base y, si trae foto, el extra. */
export const pointsForReview = (r: ReviewPoints, hasPhoto: boolean) => r.perReview + (hasPhoto ? r.perPhoto : 0);

export const canRedeem = (r: ReviewPoints, balance: number) => r.enabled && balance >= r.threshold;
