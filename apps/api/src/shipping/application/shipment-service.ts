import type { PublicTracking, ShipmentCreated } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import { recipientLabel, trackingLog, trackingStops } from "../domain/tracking";
import type { NewShipment, ShipmentRepository, ShippableOrder, ShippableOrders, ShippingGateway } from "./ports";

/**
 * Envíos con el correo (PLAN §6): etiqueta desde el panel, consulta periódica de los eventos (que mueven el pedido a
 * "en camino" y "entregado" solos) y el seguimiento público.
 */
export class ShipmentService {
  constructor(
    private readonly gateway: ShippingGateway,
    private readonly shipments: ShipmentRepository,
    private readonly orders: ShippableOrders,
    /** Página para pagar un pedido que espera el pago (número + token). */
    private readonly payUrl: (number: string, token: string) => string,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** "Generar etiqueta Andreani": da de alta el envío y deja el pedido listo para despachar. */
  async createLabel(number: string): Promise<ShipmentCreated> {
    const o = await this.shippable(number);
    if (o.status !== "preparando" && o.status !== "listo")
      throw new ConflictError("La etiqueta se genera cuando el pedido está en preparación");
    const existing = await this.shipments.byOrder(o.id);
    if (existing) return { carrier: existing.carrier, trackingNumber: existing.trackingNumber };
    const { trackingNumber } = await this.gateway.createShipment(toNewShipment(o));
    await this.shipments.create({ orderId: o.id, carrier: this.gateway.carrier, trackingNumber });
    await this.orders.labeled(o.id, trackingNumber);
    return { carrier: this.gateway.carrier, trackingNumber };
  }

  async label(number: string): Promise<{ filename: string; pdf: Uint8Array }> {
    const o = await this.shippable(number);
    const s = await this.shipments.byOrder(o.id);
    if (!s) throw new NotFoundError("Este pedido todavía no tiene etiqueta");
    return { filename: `etiqueta-${o.number}.pdf`, pdf: await this.gateway.label(s.trackingNumber, toNewShipment(o)) };
  }

  /** Consulta al correo los envíos sin entregar. Lo corre el scheduler. */
  async sync(): Promise<number> {
    let moved = 0;
    for (const s of await this.shipments.pending()) {
      const now = this.clock();
      const fresh = await this.shipments.addEvents(s.id, await this.gateway.events(s.trackingNumber), now);
      for (const e of fresh) {
        if (e.code === "picked_up") await this.orders.shipped(s.orderId, e.at);
        if (e.code === "delivered") {
          await this.orders.delivered(s.orderId, e.at);
          await this.shipments.markDelivered(s.id, e.at);
        }
      }
      moved += fresh.length;
    }
    return moved;
  }

  /** Seguimiento público por número de pedido (MG-1042) o de Andreani. Con el token, también el link para pagar. */
  async track(code: string, token: string | null): Promise<PublicTracking> {
    const clean = code.trim().toUpperCase().replace(/\s/g, "");
    const byTracking = /^\d{8,}$/.test(clean) ? await this.shipments.byTracking(clean) : null;
    const o = byTracking ? await this.orders.findById(byTracking.orderId) : await this.orders.find(clean);
    if (!o) throw new NotFoundError("No encontramos ese pedido");
    const s = byTracking ?? (await this.shipments.byOrder(o.id));
    const ev = s ? await this.shipments.events(s.id) : [];
    return {
      number: o.number,
      status: o.status,
      shippingMethod: o.shippingMethod,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      totalCents: o.totalCents,
      items: o.items,
      destination:
        o.shippingMethod === "taller"
          ? `El taller · ${o.workshop}`
          : o.shippingMethod === "sucursal"
            ? `Sucursal Andreani · ${o.province ?? ""}`
            : [o.city, o.province].filter(Boolean).join(", "),
      recipient: recipientLabel(o.firstName, o.lastName),
      shipment: s
        ? { carrier: "Andreani", trackingNumber: s.trackingNumber, url: this.gateway.trackingUrl(s.trackingNumber) }
        : null,
      stops: trackingStops(o, ev),
      log: trackingLog(o, s, ev),
      payUrl: o.status === "esperando_pago" && token && token === o.accessToken ? this.payUrl(o.number, token) : null,
    };
  }

  private async shippable(number: string): Promise<ShippableOrder & { shippingMethod: "domicilio" | "sucursal" }> {
    const o = await this.orders.find(number);
    if (!o) throw new NotFoundError("No existe ese pedido");
    if (o.shippingMethod === "taller") throw new ConflictError("Este pedido se retira en el taller: no lleva etiqueta");
    return o as ShippableOrder & { shippingMethod: "domicilio" | "sucursal" };
  }
}

function toNewShipment(o: ShippableOrder & { shippingMethod: "domicilio" | "sucursal" }): NewShipment {
  return {
    orderNumber: o.number,
    method: o.shippingMethod,
    recipient: { name: `${o.firstName} ${o.lastName}`.trim(), phone: o.phone, email: o.email },
    street: o.street,
    city: o.city,
    province: o.province ?? "",
    postalCode: o.postalCode ?? "",
    notes: o.notes,
    units: o.items.reduce((a, i) => a + i.qty, 0),
  };
}
