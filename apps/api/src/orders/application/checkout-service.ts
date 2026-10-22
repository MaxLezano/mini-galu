import { randomBytes } from "node:crypto";
import type {
  GiftcardSummary,
  OrderReceipt,
  PlacedOrder,
  PlaceOrderInputSchema,
  Quote,
  QuoteRequest,
  ShippingOptions,
} from "@mini-galu/contracts";
import type { z } from "zod";
import type { CartService } from "../../cart/application/cart-service";
import { toView } from "../../cart/application/cart-service";
import type { CartOwner } from "../../cart/application/ports";
import type { CouponService } from "../../coupons/application/coupon-service";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { ImageStorage } from "../../shared/media/image-storage";
import type { ShippingService } from "../../shipping/application/shipping-service";
import {
  CHECKOUT_RESERVATION_MINUTES,
  cancelledBy,
  computeTotals,
  formatOrderNumber,
  parseOrderNumber,
} from "../domain/order";
import type { OrderRecord, OrderRepository } from "./ports";

type PlaceOrder = z.output<typeof PlaceOrderInputSchema>;

export type GiftcardCheck = { id: string; code: string; balanceCents: number } | { error: string };

/** Lo que el checkout necesita de las gift cards: validar un código y el resumen de una compra de gift card. */
export interface CheckoutGiftcards {
  check(code: string): Promise<GiftcardCheck>;
  /** La misma validación por id (un pedido guarda la gift card con la que se pagó). */
  checkById(id: string): Promise<GiftcardCheck>;
  summary(orderId: string): Promise<GiftcardSummary | null>;
  /** Descuenta lo usado de la gift card (una vez por pedido: repetirlo da "repetido"). */
  redeem(orderId: string, giftcardId: string, cents: number): Promise<"ok" | "repetido" | "sin_saldo">;
}

export const NO_GIFTCARDS: CheckoutGiftcards = {
  check: async () => ({ error: "Las gift cards no están disponibles" }),
  checkById: async () => ({ error: "Las gift cards no están disponibles" }),
  summary: async () => null,
  redeem: async () => "sin_saldo",
};

/**
 * Antes de dar por pagado un pedido sin Mercado Pago, se descuenta la gift card. Si otro pedido gastó el saldo
 * mientras tanto (dos compras a la vez con la misma tarjeta), este se cancela y libera el stock: si no, salía
 * pagado sin que nadie pagara.
 */
export async function redeemOrCancel(
  giftcards: CheckoutGiftcards,
  orders: OrderRepository,
  order: { id: string; giftcardId: string | null; giftcardCents: number },
  now: Date,
): Promise<void> {
  if (!order.giftcardId || order.giftcardCents <= 0) return;
  if ((await giftcards.redeem(order.id, order.giftcardId, order.giftcardCents)) !== "sin_saldo") return;
  await orders.cancelReleasing(order.id, "La gift card ya no tenía saldo", now);
  throw new ConflictError("La gift card ya no tiene saldo para este pedido: revisá el saldo y probá de nuevo");
}

/** Pago aprobado sin pasar por Mercado Pago (cuando la gift card cubre todo el pedido). */
export type SettleWithGiftcard = (orderId: string) => Promise<void>;

/** Checkout: cotizar (envío + cupón) y cerrar el pedido reservando el stock. */
export class CheckoutService {
  constructor(
    private readonly cart: CartService,
    private readonly shipping: ShippingService,
    private readonly coupons: CouponService,
    private readonly orders: OrderRepository,
    private readonly storage: ImageStorage,
    private readonly giftcards: CheckoutGiftcards = NO_GIFTCARDS,
    private readonly settle: SettleWithGiftcard = async () => {
      throw new ValidationError("Este pedido no se puede pagar solo con gift card");
    },
    private readonly clock: () => Date = () => new Date(),
    private readonly newToken: () => string = () => randomBytes(18).toString("base64url"),
  ) {}

  /** `extraCents`: lo que se suma a la bolsa para cotizar (la ficha cotiza "la bolsa + esta prenda"). */
  async shippingOptions(owner: CartOwner | null, postalCode?: string, extraCents = 0): Promise<ShippingOptions> {
    const view = await this.cart.view(owner);
    return this.shipping.options(postalCode, view.subtotalCents + extraCents);
  }

  async quote(owner: CartOwner | null, req: QuoteRequest): Promise<Quote> {
    const view = toView(await this.cart.snapshot(owner));
    const shippingCents = (await this.shipping.cost(req.method, req.postalCode, view.subtotalCents)) ?? 0;
    let discountCents = 0;
    let freeShipping = false;
    let coupon: Quote["coupon"] = null;
    let couponError: string | null = null;
    if (req.couponCode) {
      const r = await this.coupons.check(req.couponCode, view.subtotalCents, req.email ?? null);
      if (!r.coupon) couponError = r.reason;
      else if (!r.result.ok) couponError = r.result.reason;
      else {
        ({ discountCents, freeShipping } = r.result);
        coupon = { code: r.coupon.code, label: r.label, discountCents, freeShipping };
      }
    }
    let giftcardBalanceCents = 0;
    let giftcardError: string | null = null;
    let giftcardCode: string | null = null;
    if (req.giftcardCode) {
      const g = await this.giftcards.check(req.giftcardCode);
      if ("error" in g) giftcardError = g.error;
      else ({ balanceCents: giftcardBalanceCents, code: giftcardCode } = g);
    }
    const totals = computeTotals({
      subtotalCents: view.subtotalCents,
      shippingCents,
      discountCents,
      freeShipping,
      giftcardBalanceCents,
    });
    const giftcard = giftcardCode
      ? {
          code: giftcardCode,
          appliedCents: totals.giftcardCents,
          balanceAfterCents: giftcardBalanceCents - totals.giftcardCents,
        }
      : null;
    return {
      lines: view.lines,
      ...totals,
      coupon,
      couponError,
      giftcard,
      giftcardError,
      freeShippingFromCents: await this.shipping.freeShippingFrom(),
    };
  }

  async place(owner: CartOwner | null, userId: string | null, input: PlaceOrder): Promise<PlacedOrder> {
    const snap = await this.cart.snapshot(owner);
    if (!snap.lines.length) throw new ValidationError("Tu bolsa está vacía");
    const subtotalCents = snap.lines.reduce((a, l) => a + l.priceCents * l.qty, 0);
    const s = input.shipping;
    await this.shipping.checkDelivery(s);
    const postalCode = s.method === "taller" ? undefined : s.postalCode;
    const branch = await sucursalOf(this.shipping, s);
    const shippingCents = await this.shipping.charge(s.method, postalCode, subtotalCents);

    let coupon: { id: string; code: string } | null = null;
    let discountCents = 0;
    let freeShipping = false;
    if (input.couponCode) {
      const r = await this.coupons.check(input.couponCode, subtotalCents, input.contact.email);
      if (!r.coupon) throw new ValidationError(r.reason);
      if (!r.result.ok) throw new ValidationError(r.result.reason);
      coupon = { id: r.coupon.id, code: r.coupon.code };
      ({ discountCents, freeShipping } = r.result);
    }
    let giftcard: { id: string; balanceCents: number } | null = null;
    if (input.giftcardCode) {
      const g = await this.giftcards.check(input.giftcardCode);
      if ("error" in g) throw new ValidationError(g.error);
      giftcard = g;
    }
    const totals = computeTotals({
      subtotalCents,
      shippingCents,
      discountCents,
      freeShipping,
      giftcardBalanceCents: giftcard?.balanceCents,
    });

    // si ya había un pedido sin pagar desde esta bolsa (volvió a cambiar algo), se cancela y libera el stock
    const now = this.clock();
    if (snap.cartId)
      for (const id of await this.orders.pendingForCart(snap.cartId))
        await this.orders.cancelReleasing(id, "Reemplazado por un pedido nuevo desde la misma bolsa", now);

    const accessToken = this.newToken();
    const reservedUntil = new Date(now.getTime() + CHECKOUT_RESERVATION_MINUTES * 60_000);
    const r = await this.orders.createReserving({
      cartId: snap.cartId,
      userId,
      accessToken,
      ...input.contact,
      ...shippingFields(s, branch),
      ...totals,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
      giftcardId: giftcard?.id ?? null,
      reservedUntil,
      wishItemIds: input.wishItemIds.length ? input.wishItemIds : undefined,
      items: snap.lines.map((l) => ({
        variantId: l.variantId,
        productSlug: l.slug,
        name: l.name,
        colorName: l.colorName,
        size: l.size,
        imagePath: l.imagePath,
        unitPriceCents: l.priceCents,
        qty: l.qty,
      })),
    });
    if (!r.ok)
      throw new ConflictError(
        r.available
          ? `Del ${r.name} en talle ${r.size} quedan ${r.available}: ajustá la cantidad`
          : `Se acaba de agotar el ${r.name} en talle ${r.size}`,
        { slug: r.productSlug, size: r.size, available: r.available },
      );
    await this.orders.addEvent(r.id, {
      kind: "created",
      title: "Pedido creado desde la web",
      detail:
        [coupon ? `Con el cupón ${coupon.code}` : null, giftcard ? "Con gift card" : null]
          .filter(Boolean)
          .join(" · ") || null,
      auto: true,
    });
    // la gift card cubre todo: no hay nada que cobrar con Mercado Pago
    const paid = totals.totalCents === 0;
    if (paid) {
      await redeemOrCancel(this.giftcards, this.orders, { id: r.id, giftcardId: giftcard?.id ?? null, ...totals }, now);
      await this.settle(r.id);
    }
    return {
      orderId: r.id,
      number: formatOrderNumber(r.number),
      accessToken,
      totalCents: totals.totalCents,
      reservedUntil: reservedUntil.toISOString(),
      paid,
    };
  }

  /** La compra de una gift card: un pedido sin prendas ni envío que se paga con el mismo link de pago. */
  async placeGiftcard(
    buyer: { email: string; firstName: string; lastName: string; phone: string; whatsappOptIn: boolean },
    amountCents: number,
  ): Promise<{ orderId: string; number: string; accessToken: string }> {
    const now = this.clock();
    const accessToken = this.newToken();
    const r = await this.orders.createReserving({
      cartId: null,
      userId: null,
      accessToken,
      ...buyer,
      kind: "giftcard",
      shippingMethod: "taller",
      shippingAddress: null,
      shippingBranch: null,
      postalCode: null,
      province: null,
      pickupSlot: null,
      ...computeTotals({ subtotalCents: amountCents, shippingCents: 0, discountCents: 0, freeShipping: true }),
      couponId: null,
      couponCode: null,
      reservedUntil: new Date(now.getTime() + CHECKOUT_RESERVATION_MINUTES * 60_000),
      items: [],
    });
    if (!r.ok) throw new ConflictError("No pudimos crear la gift card, probá de nuevo");
    await this.orders.addEvent(r.id, {
      kind: "created",
      title: "Compra de gift card desde la web",
      detail: null,
      auto: true,
    });
    return { orderId: r.id, number: formatOrderNumber(r.number), accessToken };
  }

  /**
   * Aplicar o quitar un cupón en el paso de pago: se recalcula el mismo pedido (misma reserva, mismo número)
   * para que el formulario de pago no se rearme y no se pierda lo que la persona ya cargó.
   */
  async changeCoupon(number: string, token: string, code: string | null): Promise<PlacedOrder> {
    const o = await findOwned(this.orders, number, token);
    if (o.status !== "esperando_pago") throw new ConflictError("Este pedido ya no espera pago: volvé a la bolsa");
    const shippingCents =
      (await this.shipping.cost(o.shippingMethod, o.postalCode ?? undefined, o.subtotalCents)) ?? o.shippingCents;
    let coupon: { id: string; code: string } | null = null;
    let discountCents = 0;
    let freeShipping = false;
    if (code) {
      const r = await this.coupons.check(code, o.subtotalCents, o.email);
      if (!r.coupon) throw new ValidationError(r.reason);
      if (!r.result.ok) throw new ValidationError(r.result.reason);
      coupon = { id: r.coupon.id, code: r.coupon.code };
      ({ discountCents, freeShipping } = r.result);
    }
    let giftcardBalanceCents = 0;
    if (o.giftcardId && o.giftcardCents > 0) {
      const g = await this.giftcards.checkById(o.giftcardId);
      giftcardBalanceCents = "error" in g ? 0 : g.balanceCents;
    }
    const totals = computeTotals({
      subtotalCents: o.subtotalCents,
      shippingCents,
      discountCents,
      freeShipping,
      giftcardBalanceCents,
    });
    const ok = await this.orders.updateTotals(o.id, {
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      giftcardCents: totals.giftcardCents,
      totalCents: totals.totalCents,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
    });
    if (!ok) throw new ConflictError("Este pedido ya no espera pago: volvé a la bolsa");
    // con el cupón, la gift card cubre todo: no queda nada que cobrar con Mercado Pago
    const paid = totals.totalCents === 0;
    if (paid) {
      await redeemOrCancel(
        this.giftcards,
        this.orders,
        { id: o.id, giftcardId: o.giftcardId ?? null, ...totals },
        this.clock(),
      );
      await this.settle(o.id);
    }
    return {
      orderId: o.id,
      number: formatOrderNumber(o.number),
      accessToken: token,
      totalCents: totals.totalCents,
      reservedUntil: (o.reservedUntil ?? new Date()).toISOString(),
      paid,
    };
  }

  /** Comprobante para la pantalla de éxito (sin cuenta: número + token). */
  async receipt(number: string, token: string): Promise<OrderReceipt> {
    const o = await findOwned(this.orders, number, token);
    return this.toReceipt(o, o.kind === "giftcard" ? await this.giftcards.summary(o.id) : null);
  }

  toReceipt(o: OrderRecord, giftcard: GiftcardSummary | null = null): OrderReceipt {
    return {
      number: formatOrderNumber(o.number),
      kind: o.kind,
      giftcard,
      giftcardCents: o.giftcardCents,
      status: o.status,
      cancelledBy: cancelledBy(o),
      firstName: o.firstName,
      email: o.email,
      paymentMethod: o.paymentMethod,
      installments: o.installments,
      shippingMethod: o.shippingMethod,
      pickupSlot: o.pickupSlot,
      branchLabel: o.shippingBranch ? `${o.shippingBranch.name} · ${o.shippingBranch.address}` : null,
      subtotalCents: o.subtotalCents,
      discountCents: o.discountCents,
      shippingCents: o.shippingCents,
      totalCents: o.totalCents,
      createdAt: o.createdAt.toISOString(),
      reservedUntil: o.reservedUntil?.toISOString() ?? null,
      items: o.items.map((i) => ({
        name: i.name,
        size: i.size,
        qty: i.qty,
        imageUrl: i.imagePath ? this.storage.url(i.imagePath) : "",
        unitPriceCents: i.unitPriceCents,
      })),
    };
  }
}

/** La sucursal elegida para un envío a sucursal (error si ya no es una de las del CP). */
export async function sucursalOf(shipping: ShippingService, s: PlaceOrder["shipping"]) {
  if (s.method !== "sucursal") return null;
  const b = await shipping.branch(s.postalCode, s.branchId);
  if (!b) throw new ValidationError("Esa sucursal no está disponible para tu código postal, elegí otra");
  return { id: b.id, name: b.name, address: b.address };
}

/** Cómo se guarda en el pedido el envío que eligió el cliente. */
export function shippingFields(
  s: PlaceOrder["shipping"],
  branch: { id: string; name: string; address: string } | null,
) {
  return {
    shippingBranch: s.method === "sucursal" ? branch : null,
    shippingMethod: s.method,
    shippingAddress:
      s.method === "domicilio" || s.method === "acordar" || s.method === "cadete"
        ? {
            street: s.street,
            number: s.number,
            unit: s.unit,
            city: s.city,
            province: s.province,
            postalCode: s.postalCode,
            notes: s.notes,
          }
        : null,
    postalCode: s.method === "taller" ? null : s.postalCode,
    province: s.method === "taller" ? null : s.province,
    pickupSlot: s.method === "taller" ? s.pickupSlot : null,
  };
}

/** El pedido existe y el token coincide (si no, 404: no se revela si el número existe). */
export async function findOwned(orders: OrderRepository, number: string, token: string): Promise<OrderRecord> {
  const n = parseOrderNumber(number);
  const o = n ? await orders.findByNumber(n) : null;
  if (!o || !token || o.accessToken !== token) throw new NotFoundError("No encontramos ese pedido");
  return o;
}
