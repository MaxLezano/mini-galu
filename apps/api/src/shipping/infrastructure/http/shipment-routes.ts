import { BulkAdvanceInputSchema, ShippingSettingsSchema } from "@mini-galu/contracts";
import { type Context, Hono } from "hono";
import { parse } from "../../../shared/http/errors";
import type { ShipmentService } from "../../application/shipment-service";

/** /tracking/:codigo — seguimiento público (número de pedido o de Andreani; `t` = token del pedido). */
export function trackingRoutes(shipments: ShipmentService) {
  return new Hono().get("/:code", async (c) =>
    c.json(await shipments.track(c.req.param("code"), c.req.query("t") ?? null)),
  );
}

/**
 * /admin/orders/:numero/label — generar la etiqueta y descargarla (PDF 10×15). /admin/orders/labels — lo mismo para
 * la selección del tablero (`?n=MG-1,MG-2` para el PDF). Requiere sesión del taller.
 */
export function adminShipmentRoutes(shipments: ShipmentService) {
  return new Hono()
    .post("/labels", async (c) =>
      c.json(await shipments.createLabels(parse(BulkAdvanceInputSchema, await c.req.json()).numbers)),
    )
    .get("/labels", async (c) => {
      const numbers = parse(BulkAdvanceInputSchema, { numbers: (c.req.query("n") ?? "").split(",").filter(Boolean) });
      return pdfResponse(c, await shipments.labels(numbers.numbers));
    })
    .post("/:number/label", async (c) => c.json(await shipments.createLabel(c.req.param("number")), 201))
    .get("/:number/label", async (c) => pdfResponse(c, await shipments.label(c.req.param("number"))));
}

function pdfResponse(c: Context, { filename, pdf }: { filename: string; pdf: Uint8Array }) {
  return c.body(pdf as Uint8Array<ArrayBuffer>, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "no-store",
  });
}

/** /admin/shipping — "Tienda y pagos → Envíos": paquete, origen, remitente y estado de Andreani. */
export function adminShippingRoutes(shipments: ShipmentService) {
  return new Hono()
    .get("/", async (c) => c.json(await shipments.admin()))
    .put("/", async (c) => c.json(await shipments.saveSettings(parse(ShippingSettingsSchema, await c.req.json()))));
}
