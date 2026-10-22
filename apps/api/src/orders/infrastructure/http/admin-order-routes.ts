import {
  BulkAdvanceInputSchema,
  CancelOrderInputSchema,
  MoveOrderInputSchema,
  OrderNoteInputSchema,
  PaymentLinkInputSchema,
} from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { AdminOrdersService } from "../../application/admin-orders-service";
import type { PaymentLinks } from "../../application/payment-links";

/** /admin/orders — tablero, detalle y cambios de estado (admin-pedidos.html). Requiere sesión del taller. */
export function adminOrderRoutes(orders: AdminOrdersService, links: PaymentLinks) {
  return new Hono()
    .get("/", async (c) => c.json(await orders.list()))
    .get("/summary", async (c) => c.json(await orders.summary()))
    .post("/links", async (c) => c.json(await links.create(parse(PaymentLinkInputSchema, await c.req.json())), 201))
    .post("/advance", async (c) =>
      c.json(await orders.advance(parse(BulkAdvanceInputSchema, await c.req.json()).numbers)),
    )
    .get("/:number", async (c) => c.json(await orders.detail(c.req.param("number"))))
    .patch("/:number/status", async (c) =>
      c.json(await orders.move(c.req.param("number"), parse(MoveOrderInputSchema, await c.req.json()).to)),
    )
    .post("/:number/cancel", async (c) =>
      c.json(
        await orders.cancel(
          c.req.param("number"),
          parse(CancelOrderInputSchema, await c.req.json().catch(() => ({}))).reason,
        ),
      ),
    )
    .put("/:number/note", async (c) => {
      await orders.saveNote(c.req.param("number"), parse(OrderNoteInputSchema, await c.req.json()).note);
      return c.body(null, 204);
    });
}
