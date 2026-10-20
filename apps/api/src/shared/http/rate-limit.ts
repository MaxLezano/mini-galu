import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";
import { createMiddleware } from "hono/factory";

/**
 * IP de quien pide. Detrás de Render/Cloudflare, `cf-connecting-ip` la pone el proxy (el cliente no la puede
 * elegir). `x-forwarded-for` sí la puede mandar el cliente y el proxy solo agrega al final: se toma la última, la
 * que vio el proxy más cercano (la primera es falsificable y servía para saltear los topes).
 */
export function clientIp(c: Context): string {
  const cf = c.req.header("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const fwd = c.req.header("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (fwd) return fwd;
  try {
    return getConnInfo(c).remote.address ?? "desconocida";
  } catch {
    return "desconocida";
  }
}

/** Ventana fija en memoria: hasta `max` pedidos por clave cada `windowMs`. Alcanza para una sola instancia. */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** true si todavía puede; cuenta el pedido. */
  take(key: string): boolean {
    const t = this.now();
    const h = this.hits.get(key);
    if (!h || h.resetAt <= t) {
      if (this.hits.size > 10_000) for (const [k, v] of this.hits) if (v.resetAt <= t) this.hits.delete(k);
      this.hits.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    h.count++;
    return h.count <= this.max;
  }
}

/** Middleware: corta con 429 cuando la IP pasó el tope (rutas públicas que mandan mails, reservan o adivinan). */
export function limitByIp(limiter: RateLimiter, message = "Muchos intentos seguidos: probá en unos minutos") {
  return createMiddleware(async (c, next) => {
    if (!limiter.take(clientIp(c))) return c.json({ error: { code: "too_many_requests", message } }, 429);
    await next();
  });
}
