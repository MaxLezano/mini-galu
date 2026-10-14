import { CustomerNoteSchema } from "@mini-galu/contracts";
import { Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { AdminCustomersService } from "../../application/admin-customers-service";

/** /admin/customers — Clientes en el panel: lista, CSV, ficha y nota. Requiere sesión del taller. */
export function adminCustomerRoutes(customers: AdminCustomersService) {
  return new Hono()
    .get("/", async (c) => c.json(await customers.list()))
    .get("/clientes.csv", async (c) =>
      c.body(await customers.csv(), 200, {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="clientes.csv"',
      }),
    )
    .get("/:email", async (c) => c.json(await customers.detail(c.req.param("email"))))
    .put("/:email/note", async (c) => {
      await customers.setNote(c.req.param("email"), parse(CustomerNoteSchema, await c.req.json()).note);
      return c.body(null, 204);
    });
}
