import { PlaceOrderInputSchema, QuoteRequestSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { z } from "zod";
import type { CartVars } from "../../../cart/infrastructure/http/cart-owner";
import { parse } from "../../../shared/http/errors";
import type { CheckoutService } from "../../application/checkout-service";

/** /checkout — envío, cotización, alta del pedido y comprobante. Requiere el middleware `cartOwner`. */
export function checkoutRoutes(checkout: CheckoutService) {
  return new Hono<CartVars>()
    .get("/shipping", async (c) => {
      const { cp, extra } = parse(
        z.object({
          cp: z.string().trim().max(10).optional(),
          extra: z.coerce.number().int().min(0).max(100_000_000).default(0),
        }),
        c.req.query(),
      );
      return c.json(await checkout.shippingOptions(c.get("cartOwner"), cp || undefined, extra));
    })
    .post("/quote", async (c) =>
      c.json(await checkout.quote(c.get("cartOwner"), parse(QuoteRequestSchema, await c.req.json()))),
    )
    .post("/orders", async (c) => {
      const input = parse(PlaceOrderInputSchema, await c.req.json());
      return c.json(await checkout.place(c.get("cartOwner"), c.get("userId"), input), 201);
    })
    .post("/orders/:number/coupon", async (c) => {
      const { t, couponCode } = parse(
        z.object({ t: z.string().min(1), couponCode: z.string().trim().max(30).nullable() }),
        await c.req.json(),
      );
      return c.json(await checkout.changeCoupon(c.req.param("number"), t, couponCode || null));
    })
    .get("/orders/:number", async (c) => c.json(await checkout.receipt(c.req.param("number"), c.req.query("t") ?? "")));
}
