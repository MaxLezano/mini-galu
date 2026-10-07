import { CouponInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { z } from "zod";
import { parse } from "../../../shared/http/errors";
import type { CouponService } from "../../application/coupon-service";

/** /admin/coupons — cupones (admin-tienda.html → #cupones). */
export function adminCouponRoutes(coupons: CouponService) {
  return new Hono()
    .get("/", async (c) => c.json(await coupons.list()))
    .post("/", async (c) => c.json(await coupons.create(parse(CouponInputSchema, await c.req.json())), 201))
    .put("/:id", async (c) =>
      c.json(await coupons.update(c.req.param("id"), parse(CouponInputSchema, await c.req.json()))),
    )
    .patch("/:id/active", async (c) => {
      const { active } = parse(z.object({ active: z.boolean() }), await c.req.json());
      return c.json(await coupons.setActive(c.req.param("id"), active));
    })
    .delete("/:id", async (c) => {
      await coupons.remove(c.req.param("id"));
      return c.body(null, 204);
    });
}
