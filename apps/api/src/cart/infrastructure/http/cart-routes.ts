import { CartItemInputSchema, CartMergeInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { CartService } from "../../application/cart-service";
import { type CartVars, ensureOwner } from "./cart-owner";

/** /cart — la bolsa (de invitada o de la cuenta). Requiere el middleware `cartOwner`. */
export function cartRoutes(cart: CartService, secure: boolean) {
  return new Hono<CartVars>()
    .get("/", async (c) => c.json(await cart.view(c.get("cartOwner"))))
    .post("/items", async (c) =>
      c.json(await cart.add(ensureOwner(c, secure), parse(CartItemInputSchema, await c.req.json()))),
    )
    .put("/items", async (c) =>
      c.json(await cart.set(ensureOwner(c, secure), parse(CartItemInputSchema, await c.req.json()))),
    )
    .post("/merge", async (c) => {
      const { lines } = parse(CartMergeInputSchema, await c.req.json());
      return c.json(await cart.merge(ensureOwner(c, secure), lines));
    });
}
