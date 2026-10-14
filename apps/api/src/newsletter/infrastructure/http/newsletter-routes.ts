import { LetterInputSchema, LetterTestSchema, NewsletterSignupSchema, UnsubscribeSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { NewsletterService } from "../../application/newsletter-service";

/** /newsletter — sumarse desde la tienda y darse de baja con el link de la carta. */
export function newsletterRoutes(newsletter: NewsletterService) {
  return new Hono()
    .post("/", async (c) => {
      const { email, source } = parse(NewsletterSignupSchema, await c.req.json());
      await newsletter.subscribe(email, source);
      return c.body(null, 204);
    })
    .post("/baja", async (c) => {
      await newsletter.unsubscribe(parse(UnsubscribeSchema, await c.req.json()).t);
      return c.body(null, 204);
    });
}

/** /admin/newsletter — suscriptos, cartas enviadas, prueba y envío. Requiere sesión del taller. */
export function adminNewsletterRoutes(newsletter: NewsletterService) {
  return new Hono()
    .get("/", async (c) => c.json(await newsletter.admin()))
    .get("/suscriptos.csv", async (c) =>
      c.body(await newsletter.csv(), 200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="cartas-del-taller.csv"',
      }),
    )
    .post("/test", async (c) => {
      const { email, ...letter } = parse(LetterTestSchema, await c.req.json());
      await newsletter.sendTest(letter, email);
      return c.body(null, 204);
    })
    .post("/send", async (c) => c.json(await newsletter.send(parse(LetterInputSchema, await c.req.json()))));
}
