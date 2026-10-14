import { getConnInfo } from "@hono/node-server/conninfo";
import type { Context } from "hono";

/** IP de quien pide (detrás del proxy del hosting, la primera de x-forwarded-for). */
export function clientIp(c: Context): string {
  const fwd = c.req.header("x-forwarded-for")?.split(",")[0]?.trim();
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
