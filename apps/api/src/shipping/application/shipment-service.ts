import {
  type AdminShipping,
  type BulkLabels,
  isAndreani,
  type PublicTracking,
  type ShipmentCreated,
  type ShippingSettings,
} from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import { recipientLabel, trackingLog, trackingStops } from "../domain/tracking";
import type {
  NewShipment,
  PdfMerger,
  ShipmentRepository,
  ShippableOrder,
  ShippableOrders,
  ShippingGateway,
  ShippingSettingsStore,
} from "./ports";

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
    private readonly settings: ShippingSettingsStore,
    /** De dónde salen las sucursales (para mostrarlo en el panel). */
    private readonly branchesSource: "andreani" | "fake",
    private readonly merger: PdfMerger,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** "Tienda y pagos → Envíos". */
  async admin(): Promise<AdminShipping> {
    return {
      settings: await this.settings.get(),
      andreani: { mode: this.gateway.mode, branches: this.branchesSource },
    };
  }

  async saveSettings(s: ShippingSettings): Promise<AdminShipping> {
    await this.settings.save(s);
    return this.admin();
  }

  /** "Generar etiqueta Andreani": da de alta el envío y deja el pedido listo para despachar. */
  async createLabel(number: string): Promise<ShipmentCreated> {
    const o = await this.shippable(number);
    if (o.status !== "preparando" && o.status !== "listo")
      throw new ConflictError("La etiqueta se genera cuando el pedido está en preparación");
    const existing = await this.shipments.byOrder(o.id);
    if (existing) return { carrier: existing.carrier, trackingNumber: existing.trackingNumber };
    const from = await this.settings.get();
    // el correo real necesita saber desde dónde sale y con qué paquete; el simulado no
    if (!from && this.gateway.mode !== "simulado")
      throw new ConflictError("Completá los datos de envío (origen, remitente y paquete) en Tienda y pagos");
    const { trackingNumber } = await this.gateway.createShipment(toNewShipment(o, from));
    await this.shipments.create({ orderId: o.id, carrier: this.gateway.carrier, trackingNumber });
    await this.orders.labeled(o.id, trackingNumber);
    return { carrier: this.gateway.carrier, trackingNumber };
  }

  async label(number: string): Promise<{ filename: string; pdf: Uint8Array }> {
    const o = await this.shippable(number);
    const s = await this.shipments.byOrder(o.id);
    if (!s) throw new NotFoundError("Este pedido todavía no tiene etiqueta");
    const pdf = await this.gateway.label(s.trackingNumber, toNewShipment(o, await this.settings.get()));
    return { filename: `etiqueta-${o.number}.pdf`, pdf };
  }

  /**
   * "Etiquetas" de la selección del tablero: genera las que faltan (pedidos en preparación o listos) y deja afuera,
   * con el porqué, los que no llevan (retiro en el taller, todavía sin preparar, número que no existe).
   */
  async createLabels(numbers: string[]): Promise<BulkLabels> {
    const out: BulkLabels = { labeled: [], skipped: [] };
    for (const number of new Set(numbers)) {
      try {
        const o = await this.shippable(number);
        if (!(await this.shipments.byOrder(o.id))) await this.createLabel(number);
        out.labeled.push(o.number);
      } catch (e) {
        if (!(e instanceof ConflictError || e instanceof NotFoundError)) throw e;
        out.skipped.push({ number, reason: e.message });
      }
    }
    return out;
  }

  /** Las etiquetas que ya existen de esos pedidos, en un solo PDF (una por hoja 10×15, en el orden pedido). */
  async labels(numbers: string[]): Promise<{ filename: string; pdf: Uint8Array }> {
    const pdfs: Uint8Array[] = [];
    for (const number of new Set(numbers)) {
      const o = await this.orders.find(number);
      if (!o || !isAndreani(o.shippingMethod)) continue;
      const s = await this.shipments.byOrder(o.id);
      if (s)
        pdfs.push(await this.gateway.label(s.trackingNumber, toNewShipment(o as Labelable, await this.settings.get())));
    }
    if (!pdfs.length) throw new NotFoundError("Ninguno de esos pedidos tiene etiqueta");
    return { filename: `etiquetas-${pdfs.length}.pdf`, pdf: await this.merger.merge(pdfs) };
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
    // con el token del pedido (link del mail o del checkout): total y link para pagar
    const owner = token && token === o.accessToken ? token : null;
    return {
      number: o.number,
      status: o.status,
      shippingMethod: o.shippingMethod,
      createdAt: o.createdAt.toISOString(),
      paidAt: o.paidAt?.toISOString() ?? null,
      totalCents: owner ? o.totalCents : null,
      items: o.items,
      destination:
        o.shippingMethod === "taller"
          ? `El taller · ${o.workshop}`
          : o.shippingMethod === "sucursal"
            ? `Sucursal Andreani · ${o.branch?.name ?? o.province ?? ""}`
            : [o.city, o.province].filter(Boolean).join(", "),
      recipient: recipientLabel(o.firstName, o.lastName),
      shipment: s
        ? { carrier: "Andreani", trackingNumber: s.trackingNumber, url: this.gateway.trackingUrl(s.trackingNumber) }
        : null,
      stops: trackingStops(o, ev),
      log: trackingLog(o, s, ev),
      payUrl: o.status === "esperando_pago" && owner ? this.payUrl(o.number, owner) : null,
    };
  }

  private async shippable(number: string): Promise<Labelable> {
    const o = await this.orders.find(number);
    if (!o) throw new NotFoundError("No existe ese pedido");
    if (o.shippingMethod === "taller") throw new ConflictError("Este pedido se retira en el taller: no lleva etiqueta");
    if (!isAndreani(o.shippingMethod))
      throw new ConflictError("Este envío se coordina por WhatsApp: no lleva etiqueta de Andreani");
    return o as Labelable;
  }
}

type Labelable = ShippableOrder & { shippingMethod: "domicilio" | "sucursal" };

function toNewShipment(o: Labelable, from: ShippingSettings | null): NewShipment {
  return {
    orderNumber: o.number,
    method: o.shippingMethod,
    recipient: { name: `${o.firstName} ${o.lastName}`.trim(), phone: o.phone, email: o.email },
    street: o.street,
    address: o.address,
    city: o.city,
    province: o.province ?? "",
    postalCode: o.postalCode ?? "",
    notes: o.notes,
    branch: o.branch,
    units: o.items.reduce((a, i) => a + i.qty, 0),
    from,
  };
}
