import { randomBytes } from "node:crypto";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import type { Auth } from "../../../auth/infrastructure/better-auth";
import type { CartService } from "../../application/cart-service";
import type { CartOwner } from "../../application/ports";

export const CART_COOKIE = "mg_cart";
const MAX_AGE = 60 * 60 * 24 * 60; // 60 días

export type CartVars = { Variables: { cartOwner: CartOwner | null; userId: string | null } };

/**
 * Resuelve de quién es la bolsa: la cuenta con sesión o la invitada de la cookie `mg_cart`.
 * Si hay sesión y además cookie de invitada, la bolsa de invitada se suma a la de la cuenta (merge al ingresar).
 */
export function cartOwner(auth: Auth, cart: CartService, secure: boolean) {
  return createMiddleware<CartVars>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers }).catch(() => null);
    const token = getCookie(c, CART_COOKIE);
    const userId = session?.user.id ?? null;
    if (userId && token) {
      await cart.adopt(token, userId);
      deleteCookie(c, CART_COOKIE, { path: "/", secure });
    }
    c.set("userId", userId);
    c.set("cartOwner", userId ? { userId } : token ? { token } : null);
    await next();
  });
}

/** Para escribir: si es invitada sin cookie, se crea el token. */
export function ensureOwner(c: Context<CartVars>, secure: boolean): CartOwner {
  const owner = c.get("cartOwner");
  if (owner) return owner;
  const token = randomBytes(24).toString("base64url");
  setCookie(c, CART_COOKIE, token, { path: "/", httpOnly: true, sameSite: "Lax", secure, maxAge: MAX_AGE });
  const created = { token };
  c.set("cartOwner", created);
  return created;
}
