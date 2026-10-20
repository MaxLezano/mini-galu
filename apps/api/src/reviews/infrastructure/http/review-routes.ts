import { MAX_IMAGE_BYTES, ReviewInputSchema, ReviewModerationSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { AdminVars } from "../../../auth/infrastructure/http/auth-routes";
import { parse } from "../../../shared/http/errors";
import { clientIp, RateLimiter } from "../../../shared/http/rate-limit";
import type { ReviewService } from "../../application/review-service";

/** /reviews/:pedido?t=… — el cliente reseña las prendas de su pedido (sin cuenta: con el token del pedido). */
export function reviewRoutes(reviews: ReviewService, limiter = new RateLimiter(30, 10 * 60_000)) {
  return new Hono()
    .get("/:number", async (c) => c.json(await reviews.forOrder(c.req.param("number"), c.req.query("t") ?? "")))
    .post(
      "/:number/items/:item",
      // la foto más el texto: un poco más que la foto sola
      bodyLimit({
        maxSize: MAX_IMAGE_BYTES + 64 * 1024,
        onError: (c) => c.json({ error: { code: "validation_error", message: "La foto pesa más de 8 MB" } }, 413),
      }),
      async (c) => {
        if (!limiter.take(clientIp(c)))
          return c.json(
            { error: { code: "too_many_requests", message: "Muchos intentos seguidos: probá en unos minutos" } },
            429,
          );
        const body = await c.req.parseBody();
        const input = parse(ReviewInputSchema, { rating: body.rating, body: body.body, fit: body.fit || null });
        const file = body.photo instanceof File && body.photo.size > 0 ? body.photo : null;
        const photo = file ? { type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) } : null;
        return c.json(
          await reviews.submit(c.req.param("number"), c.req.query("t") ?? "", c.req.param("item"), input, photo),
          201,
        );
      },
    );
}

/** /admin/reviews — protegido con requireAdmin en app.ts. */
export function adminReviewRoutes(reviews: ReviewService) {
  return new Hono<AdminVars>()
    .get("/", async (c) => c.json(await reviews.list()))
    .patch("/:id", async (c) =>
      c.json(await reviews.moderate(c.req.param("id"), parse(ReviewModerationSchema, await c.req.json()))),
    );
}
