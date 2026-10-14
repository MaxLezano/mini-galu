import { Hono } from "hono";
import type { ShipmentService } from "../../application/shipment-service";

/** /tracking/:codigo — seguimiento público (número de pedido o de Andreani; `t` = token del pedido). */
export function trackingRoutes(shipments: ShipmentService) {
  return new Hono().get("/:code", async (c) =>
    c.json(await shipments.track(c.req.param("code"), c.req.query("t") ?? null)),
  );
}

/** /admin/orders/:numero/label — generar la etiqueta y descargarla (PDF 10×15). Requiere sesión del taller. */
export function adminShipmentRoutes(shipments: ShipmentService) {
  return new Hono()
    .post("/:number/label", async (c) => c.json(await shipments.createLabel(c.req.param("number")), 201))
    .get("/:number/label", async (c) => {
      const { filename, pdf } = await shipments.label(c.req.param("number"));
      return c.body(pdf as Uint8Array<ArrayBuffer>, 200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      });
    });
}
