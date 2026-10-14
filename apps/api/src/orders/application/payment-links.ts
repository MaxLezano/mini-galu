import { randomBytes } from "node:crypto";
import {
  PAYMENT_LINK_HOURS,
  PAYMENT_LINK_REMINDER_HOURS,
  type PaymentLinkCreated,
  type PaymentLinkInputSchema,
} from "@mini-galu/contracts";
import type { z } from "zod";
import type { VariantCatalog } from "../../cart/application/ports";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { EventBus } from "../../shared/events/event-bus";
import type { ShippingService } from "../../shipping/application/shipping-service";
import { computeTotals, formatOrderNumber, payPath } from "../domain/order";
import { shippingFields } from "./checkout-service";
import type { OrderRepository } from "./ports";

type PaymentLinkInput = z.output<typeof PaymentLinkInputSchema>;

const CHANNEL = { whatsapp: "WhatsApp", instagram: "Instagram" } as const;
const HOUR = 3_600_000;

/**
 * Links de pago (PLAN §6): una venta por Instagram o WhatsApp se carga en el panel, el pedido queda esperando el
 * pago con el stock reservado 72 h y el cliente paga en la tienda. A las 24 h se le recuerda; a las 72 h se libera.
 */
export class PaymentLinks {
  constructor(
    private readonly variants: VariantCatalog,
    private readonly shipping: ShippingService,
    private readonly orders: OrderRepository,
    private readonly events: EventBus,
    private readonly webOrigin: string,
    private readonly clock: () => Date = () => new Date(),
    private readonly newToken: () => string = () => randomBytes(18).toString("base64url"),
  ) {}

  async create(input: PaymentLinkInput): Promise<PaymentLinkCreated> {
    const items = [];
    for (const i of input.items) {
      const v = await this.variants.find(i.slug, i.size);
      if (!v) throw new NotFoundError(`No existe el talle ${i.size} de esa prenda`);
      items.push({ v, qty: i.qty });
    }
    const s = input.shipping;
    if (s.method === "taller" && !this.shipping.validSlot(s.pickupSlot))
      throw new ValidationError("Ese horario de retiro ya no está disponible, elegí otro");
    const subtotalCents = items.reduce((a, { v, qty }) => a + v.priceCents * qty, 0);
    const shippingCents =
      (await this.shipping.cost(s.method, s.method === "taller" ? undefined : s.postalCode, subtotalCents)) ?? 0;
    const totals = computeTotals({ subtotalCents, shippingCents, discountCents: 0, freeShipping: false });
    const now = this.clock();
    const accessToken = this.newToken();
    const reservedUntil = new Date(now.getTime() + PAYMENT_LINK_HOURS * HOUR);
    const r = await this.orders.createReserving({
      cartId: null,
      userId: null,
      accessToken,
      ...input.contact,
      ...shippingFields(s),
      ...totals,
      couponId: null,
      couponCode: null,
      reservedUntil,
      channel: input.channel,
      items: items.map(({ v, qty }) => ({
        variantId: v.variantId,
        productSlug: v.slug,
        name: v.name,
        colorName: v.colorName,
        size: v.size,
        imagePath: v.imagePath,
        unitPriceCents: v.priceCents,
        qty,
      })),
    });
    if (!r.ok)
      throw new ConflictError(
        r.available
          ? `Del ${r.name} en talle ${r.size} quedan ${r.available}`
          : `No hay stock del ${r.name} en talle ${r.size}`,
        { slug: r.productSlug, size: r.size, available: r.available },
      );
    await this.orders.addEvent(r.id, {
      kind: "created",
      title: `Link de pago generado para ${CHANNEL[input.channel]}`,
      detail: `Las prendas quedan reservadas ${PAYMENT_LINK_HOURS} h`,
      auto: false,
    });
    const number = formatOrderNumber(r.number);
    return {
      number,
      payUrl: this.webOrigin + payPath(number, accessToken),
      totalCents: totals.totalCents,
      reservedUntil: reservedUntil.toISOString(),
    };
  }

  /** Recordatorio a las 24 h de los links sin pagar (una sola vez por pedido). */
  async remindUnpaid(): Promise<number> {
    const now = this.clock();
    const due = await this.orders.linksToRemind(new Date(now.getTime() - PAYMENT_LINK_REMINDER_HOURS * HOUR));
    for (const o of due) {
      const number = formatOrderNumber(o.number);
      // primero se anota (no se manda dos veces si el mail tarda o el proceso se reinicia)
      await this.orders.addEvent(o.id, {
        kind: "reminder",
        title: "Recordatorio de pago enviado",
        detail: `Por mail a ${o.email}`,
        auto: true,
      });
      await this.events.publish({
        type: "PaymentLinkReminder",
        occurredAt: now,
        payload: {
          orderId: o.id,
          number,
          email: o.email,
          firstName: o.firstName,
          totalCents: o.totalCents,
          payUrl: this.webOrigin + payPath(number, o.accessToken),
          reservedUntil: o.reservedUntil?.toISOString() ?? null,
        },
      });
    }
    return due.length;
  }
}
