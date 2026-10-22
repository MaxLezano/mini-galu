import { type OrderStatus, PAYMENT_METHODS } from "@mini-galu/contracts";
import type { EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import type { ShippableOrder, ShippableOrders } from "../../shipping/application/ports";
import { statusTitle } from "../domain/flow";
import { formatOrderNumber, parseOrderNumber } from "../domain/order";
import type { AdminOrderRepository, OrderRecord } from "./ports";

/**
 * Lo que el módulo de envíos puede hacer con un pedido: leerlo (etiqueta y seguimiento) y moverlo cuando el correo
 * informa algo. Los movimientos quedan en el historial como hechos por el sistema y publican OrderStatusChanged.
 */
export class OrderShipping implements ShippableOrders {
  constructor(
    private readonly orders: AdminOrderRepository & { findById(id: string): Promise<OrderRecord | null> },
    private readonly storage: ImageStorage,
    private readonly events: EventBus,
    /** "San Miguel de Tucumán, Tucumán" */
    private readonly workshop: () => Promise<string>,
    /** Con WhatsApp sin conectar, el seguimiento no ofrece "Avisos por WhatsApp". */
    private readonly whatsapp = false,
  ) {}

  async find(number: string) {
    const n = parseOrderNumber(number);
    const o = n ? await this.orders.findByNumber(n) : null;
    return o ? this.view(o) : null;
  }

  async findById(id: string) {
    const o = await this.orders.findById(id);
    return o ? this.view(o) : null;
  }

  async labeled(orderId: string, trackingNumber: string) {
    const o = await this.orders.findById(orderId);
    if (!o) return;
    await this.orders.addEvent(o.id, {
      kind: "label",
      title: "Etiqueta Andreani generada",
      detail: `Nº ${trackingNumber}`,
      auto: false,
    });
    if (o.status === "preparando") await this.move(o, "listo", new Date(), false);
  }

  async shipped(orderId: string, at: Date) {
    const o = await this.orders.findById(orderId);
    if (!o) return;
    await this.orders.addEvent(o.id, { kind: "carrier", title: "Retirado por Andreani", detail: null, auto: true });
    if (o.status === "listo") await this.move(o, "en_camino", at, true);
  }

  async delivered(orderId: string, at: Date) {
    const o = await this.orders.findById(orderId);
    if (!o) return;
    await this.orders.addEvent(o.id, {
      kind: "carrier",
      title: "Andreani informó la entrega",
      detail: null,
      auto: true,
    });
    if (o.status === "listo" || o.status === "en_camino") await this.move(o, "entregado", at, true);
  }

  private async move(o: OrderRecord, to: OrderStatus, at: Date, auto: boolean) {
    if (!(await this.orders.setStatus(o.id, o.status, to, at))) return;
    await this.orders.addEvent(o.id, {
      kind: "status",
      title: statusTitle(to, o.shippingMethod),
      detail: null,
      auto,
      toStatus: to,
    });
    // TODO(fase 6 · automations): avisar al cliente (despachado con el link de seguimiento, entregado)
    await this.events.publish({
      type: "OrderStatusChanged",
      occurredAt: at,
      payload: { orderId: o.id, number: formatOrderNumber(o.number), from: o.status, to },
    });
  }

  private async view(o: OrderRecord): Promise<ShippableOrder> {
    const a = o.shippingAddress;
    const events = await this.orders.events(o.id);
    return {
      id: o.id,
      number: formatOrderNumber(o.number),
      accessToken: o.accessToken,
      status: o.status,
      shippingMethod: o.shippingMethod,
      channel: o.channel,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      paidWith: o.paymentMethod
        ? `${PAYMENT_METHODS[o.paymentMethod]}${(o.installments ?? 1) > 1 ? ` · ${o.installments} cuotas` : ""}`
        : null,
      moves: events
        .filter((e) => e.toStatus)
        .map((e) => ({ to: e.toStatus as OrderStatus, at: e.at }))
        .sort((x, y) => x.at.getTime() - y.at.getTime()),
      workshop: await this.workshop(),
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      phone: o.phone,
      whatsappOptIn: this.whatsapp ? o.whatsappOptIn : null,
      totalCents: o.totalCents,
      street: a ? `${a.street} ${a.number}${a.unit ? `, ${a.unit}` : ""}` : null,
      address: a ? { street: a.street, number: a.number, unit: a.unit } : null,
      city: a?.city ?? null,
      province: a?.province ?? o.province,
      postalCode: a?.postalCode ?? o.postalCode,
      notes: a?.notes ?? null,
      branch: o.shippingBranch,
      items: o.items.map((i) => ({
        slug: i.productSlug,
        name: i.name,
        size: i.size,
        qty: i.qty,
        imageUrl: i.imagePath ? this.storage.url(i.imagePath) : "",
      })),
    };
  }
}
