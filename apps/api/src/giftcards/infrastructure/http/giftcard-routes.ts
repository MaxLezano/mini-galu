import { GiftcardPurchaseSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { GiftcardService } from "../../application/giftcard-service";

/** /giftcards — comprar una (se paga en /pagar/MG-… como cualquier pedido) y consultar el saldo. */
export function giftcardRoutes(giftcards: GiftcardService) {
  return new Hono()
    .post("/", async (c) => c.json(await giftcards.buy(parse(GiftcardPurchaseSchema, await c.req.json())), 201))
    .get("/:code", async (c) => c.json(await giftcards.balance(c.req.param("code"))));
}

/** /admin/giftcards — vendidas, saldo sin usar y cada tarjeta (admin-tienda.html). Requiere sesión del taller. */
export function adminGiftcardRoutes(giftcards: GiftcardService) {
  return new Hono().get("/", async (c) => c.json(await giftcards.admin()));
}
