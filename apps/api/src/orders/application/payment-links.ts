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
import {
  type CheckoutGiftcards,
  NO_GIFTCARDS,
  type SettleWithGiftcard,
  shippingFields,
  sucursalOf,
} from "./checkout-service";
import type { AdminOrderRepository, OrderRepository } from "./ports";

type PaymentLinkInput = z.output<typeof PaymentLinkInputSchema>;

const CHANNEL = { whatsapp: "WhatsApp", instagram: "Instagram", taller: "el taller" } as const;

/** Venta en el taller: se la lleva en el momento, sin entrega ni horario de retiro. */
const IN_PERSON = {
  shippingBranch: null,
  shippingMethod: "taller",
  shippingAddress: null,
  postalCode: null,
  province: null,
  pickupSlot: null,
} as const;
const HOUR = 3_600_000;

/**
 * Links de pago (PLAN §6): una venta por Instagram o WhatsApp se carga en el panel, el pedido queda esperando el
 * pago con el stock reservado 72 h y el cliente paga en la tienda. A las 24 h se le recuerda; a las 72 h se libera.
 * Una venta en el taller es igual pero sin entrega. Con una gift card se descuenta su saldo y, si cubre todo, el
 * pedido queda pagado sin Mercado Pago.
 */
export class PaymentLinks {
  constructor(
    private readonly variants: VariantCatalog,
    private readonly shipping: ShippingService,
    private readonly orders: OrderRepository & Pick<AdminOrderRepository, "setStatus">,
    private readonly events: EventBus,
    private readonly webOrigin: string,
    /** Regla "Link de pago sin pagar" (Automatizaciones): si está pausada no se manda el recordatorio. */
    private readonly remindersOn: () => Promise<boolean> = async () => true,
    private readonly clock: () => Date = () => new Date(),
    private readonly newToken: () => string = () => randomBytes(18).toString("base64url"),
    private readonly giftcards: CheckoutGiftcards = NO_GIFTCARDS,
    private readonly settle: SettleWithGiftcard = async () => {
      throw new ValidationError("Este pedido no se puede pagar solo con gift card");
    },
  ) {}

  async create(input: PaymentLinkInput): Promise<PaymentLinkCreated> {
    const items = [];
    for (const i of input.items) {
      const v = await this.variants.find(i.slug, i.size);
      if (!v) throw new NotFoundError(`No existe el talle ${i.size} de esa prenda`);
      items.push({ v, qty: i.qty });
    }
    const s = input.channel === "taller" ? null : input.shipping;
    if (input.channel !== "taller" && !s) throw new ValidationError("Elegí la entrega");
    if (s?.method === "taller" && !this.shipping.validSlot(s.pickupSlot))
      throw new ValidationError("Ese horario de retiro ya no está disponible, elegí otro");
    const branch = s ? await sucursalOf(this.shipping, s) : null;
    const subtotalCents = items.reduce((a, { v, qty }) => a + v.priceCents * qty, 0);
    const shippingCents = s
      ? ((await this.shipping.cost(s.method, s.method === "taller" ? undefined : s.postalCode, subtotalCents)) ?? 0)
      : 0;
    let giftcard: { id: string; code: string; balanceCents: number } | null = null;
    if (input.giftcardCode) {
      const g = await this.giftcards.check(input.giftcardCode);
      if ("error" in g) throw new ValidationError(g.error);
      giftcard = g;
    }
    const totals = computeTotals({
      subtotalCents,
      shippingCents,
      discountCents: 0,
      freeShipping: false,
      giftcardBalanceCents: giftcard?.balanceCents,
    });
    const now = this.clock();
    const accessToken = this.newToken();
    const reservedUntil = new Date(now.getTime() + PAYMENT_LINK_HOURS * HOUR);
    const r = await this.orders.createReserving({
      cartId: null,
      userId: null,
      accessToken,
      ...input.contact,
      ...(s ? shippingFields(s, branch) : IN_PERSON),
      ...totals,
      couponId: null,
      couponCode: null,
      giftcardId: giftcard?.id ?? null,
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
    const paid = totals.totalCents === 0;
    await this.orders.addEvent(r.id, {
      kind: "created",
      title:
        input.channel === "taller"
          ? "Venta cargada en el taller"
          : `Link de pago generado para ${CHANNEL[input.channel]}`,
      detail: [
        giftcard ? `Con la gift card ${giftcard.code}` : null,
        paid ? null : `Las prendas quedan reservadas ${PAYMENT_LINK_HOURS} h`,
      ]
        .filter(Boolean)
        .join(" · "),
      auto: false,
    });
    // la gift card cubre todo: queda pagado (y descontado del saldo) sin pasar por Mercado Pago
    if (paid) await this.settle(r.id);
    const number = formatOrderNumber(r.number);
    return {
      number,
      payUrl: this.webOrigin + payPath(number, accessToken),
      totalCents: totals.totalCents,
      giftcardCents: totals.giftcardCents,
      paid,
      reservedUntil: reservedUntil.toISOString(),
    };
  }

  /** Pago aprobado de una venta en el taller: se la llevó en el momento, no hay nada que preparar. */
  async handedOver(orderId: string): Promise<void> {
    const o = await this.orders.findById(orderId);
    if (o?.channel !== "taller" || !(await this.orders.setStatus(o.id, "nuevo", "entregado", this.clock()))) return;
    await this.orders.addEvent(o.id, {
      kind: "status",
      title: "Entregado en el taller",
      detail: "Se lo llevó en el momento",
      auto: true,
      toStatus: "entregado",
    });
  }

  /** Recordatorio a las 24 h de los links sin pagar (una sola vez por pedido). */
  async remindUnpaid(): Promise<number> {
    if (!(await this.remindersOn())) return 0;
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
