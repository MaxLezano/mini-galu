import type { CouponAudience, CouponKind } from "@mini-galu/contracts";

export type Coupon = {
  id: string;
  code: string;
  kind: CouponKind;
  /** Porcentaje o centavos. */
  value: number;
  minSubtotalCents: number | null;
  audience: CouponAudience;
  endsAt: Date | null;
  maxUses: number | null;
  oncePerCustomer: boolean;
  active: boolean;
  timesUsed: number;
  /** Cupón personal (canje de puntos): solo con ese mail. */
  email: string | null;
  createdAt: Date;
};

/** Lo que hace falta saber del cliente para algunos cupones. */
export type CouponFacts = {
  usedByEmail: boolean;
  hasPaidOrder: boolean;
  isLaunchSignup: boolean;
  /** Le llegó el mail "Se acerca un cumple" en los últimos 45 días (15 antes del cumple + 30 después). */
  gotBirthdayMail: boolean;
};

export const NO_FACTS: CouponFacts = {
  usedByEmail: false,
  hasPaidOrder: false,
  isLaunchSignup: false,
  gotBirthdayMail: false,
};

export type CouponContext = { subtotalCents: number; now: Date; email: string | null; facts: CouponFacts };

export type CouponResult = { ok: true; discountCents: number; freeShipping: boolean } | { ok: false; reason: string };

const money = (cents: number) => `$${Math.round(cents / 100).toLocaleString("es-AR")}`;

/** Reglas de un cupón. Los mensajes los ve el cliente en el checkout. */
export function evaluateCoupon(c: Coupon, ctx: CouponContext): CouponResult {
  if (!c.active) return { ok: false, reason: "Ese cupón está pausado" };
  if (c.endsAt && c.endsAt.getTime() < ctx.now.getTime()) return { ok: false, reason: "Ese cupón ya venció" };
  if (c.maxUses !== null && c.timesUsed >= c.maxUses)
    return { ok: false, reason: "Ese cupón ya se usó todas las veces" };
  if (c.minSubtotalCents !== null && ctx.subtotalCents < c.minSubtotalCents)
    return { ok: false, reason: `Ese cupón es para compras desde ${money(c.minSubtotalCents)}` };
  const needsEmail = c.oncePerCustomer || c.audience !== "todos" || c.email !== null;
  if (needsEmail && !ctx.email) return { ok: false, reason: "Completá tu email para usar este cupón" };
  if (c.email !== null && ctx.email !== c.email)
    return { ok: false, reason: "Ese cupón es de tus puntos: usalo con el email de tu cuenta" };
  if (c.oncePerCustomer && ctx.facts.usedByEmail) return { ok: false, reason: "Ya usaste este cupón" };
  if (c.audience === "primera_compra" && ctx.facts.hasPaidOrder)
    return { ok: false, reason: "Ese cupón es para la primera compra" };
  if (c.audience === "anotados" && !ctx.facts.isLaunchSignup)
    return { ok: false, reason: "Ese cupón es para quienes se anotaron al lanzamiento con este email" };
  if (c.audience === "cumple" && !ctx.facts.gotBirthdayMail)
    return { ok: false, reason: "Ese cupón llega con el mail de cumpleaños, con el email de la cuenta" };
  if (c.kind === "free_shipping") return { ok: true, discountCents: 0, freeShipping: true };
  const discountCents =
    c.kind === "percent" ? Math.round((ctx.subtotalCents * c.value) / 100) : Math.min(c.value, ctx.subtotalCents);
  return { ok: true, discountCents, freeShipping: false };
}

export const normalizeCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
