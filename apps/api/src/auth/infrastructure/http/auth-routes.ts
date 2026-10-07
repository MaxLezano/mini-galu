import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import type { Auth } from "../better-auth";

export type AdminVars = { Variables: { adminId: string } };

/** /auth/* lo resuelve Better Auth (sign-in/email, sign-out, get-session…). */
export function authRoutes(auth: Auth) {
  return new Hono().on(["GET", "POST"], "/*", (c) => auth.handler(c.req.raw));
}

/** Solo la cuenta del taller (role admin) pasa. 401 sin sesión, 403 si es otra cuenta. */
export function requireAdmin(auth: Auth) {
  return createMiddleware<AdminVars>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: { code: "unauthorized", message: "Ingresá al panel del taller" } }, 401);
    if (session.user.role !== "admin")
      return c.json({ error: { code: "forbidden", message: "Sin acceso al panel" } }, 403);
    c.set("adminId", session.user.id);
    await next();
  });
}
