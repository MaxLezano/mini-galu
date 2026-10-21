import { Hono } from "hono";
import type { InvoiceService } from "../../application/invoice-service";

/**
 * /admin/invoices — comprobantes de ARCA en el panel: los trabados (campana), el PDF y "Reintentar" desde el detalle
 * del pedido. Requiere sesión del taller.
 */
export function adminInvoiceRoutes(invoices: InvoiceService) {
  return new Hono()
    .get("/problems", async (c) => c.json(await invoices.problems()))
    .get("/:id/pdf", async (c) => {
      const { filename, pdf } = await invoices.pdf(c.req.param("id"));
      return c.body(pdf as Uint8Array<ArrayBuffer>, 200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      });
    })
    .post("/orders/:number/retry", async (c) => c.json(await invoices.retry(c.req.param("number"))));
}
