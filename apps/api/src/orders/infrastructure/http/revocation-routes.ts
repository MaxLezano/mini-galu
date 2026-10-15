import { RevocationInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import { clientIp, RateLimiter } from "../../../shared/http/rate-limit";
import type { Revocations } from "../../application/revocations";

/** /revocations — botón de arrepentimiento: público, sin cuenta (con tope por IP para no probar mails). */
export function revocationRoutes(revocations: Revocations, limiter = new RateLimiter(20, 10 * 60_000)) {
  return new Hono().post("/", async (c) => {
    const input = parse(RevocationInputSchema, await c.req.json());
    if (!limiter.take(clientIp(c)))
      return c.json(
        { error: { code: "too_many_requests", message: "Muchos intentos seguidos: probá en unos minutos" } },
        429,
      );
    return c.json(await revocations.request(input), 201);
  });
}
