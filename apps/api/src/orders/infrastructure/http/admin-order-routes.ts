import { BulkAdvanceInputSchema, MoveOrderInputSchema, OrderNoteInputSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { AdminOrdersService } from "../../application/admin-orders-service";

/** /admin/orders — tablero, detalle y cambios de estado (admin-pedidos.html). Requiere sesión del taller. */
export function adminOrderRoutes(orders: AdminOrdersService) {
  return new Hono()
    .get("/", async (c) => c.json(await orders.list()))
    .get("/summary", async (c) => c.json(await orders.summary()))
    .post("/advance", async (c) =>
      c.json(await orders.advance(parse(BulkAdvanceInputSchema, await c.req.json()).numbers)),
    )
    .get("/:number", async (c) => c.json(await orders.detail(c.req.param("number"))))
    .patch("/:number/status", async (c) =>
      c.json(await orders.move(c.req.param("number"), parse(MoveOrderInputSchema, await c.req.json()).to)),
    )
    .put("/:number/note", async (c) => {
      await orders.saveNote(c.req.param("number"), parse(OrderNoteInputSchema, await c.req.json()).note);
      return c.body(null, 204);
    });
}
