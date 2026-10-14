import { randomBytes } from "node:crypto";
import {
  FREE_SHIPPING_FROM_CENTS,
  type OrderReceipt,
  type PlacedOrder,
  type PlaceOrderInputSchema,
  type Quote,
  type QuoteRequest,
  type ShippingOptions,
} from "@mini-galu/contracts";
import type { z } from "zod";
import type { CartService } from "../../cart/application/cart-service";
import { toView } from "../../cart/application/cart-service";
import type { CartOwner } from "../../cart/application/ports";
import type { CouponService } from "../../coupons/application/coupon-service";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { ImageStorage } from "../../shared/media/image-storage";
import type { ShippingService } from "../../shipping/application/shipping-service";
import { CHECKOUT_RESERVATION_MINUTES, computeTotals, formatOrderNumber, parseOrderNumber } from "../domain/order";
import type { OrderRecord, OrderRepository } from "./ports";

type PlaceOrder = z.output<typeof PlaceOrderInputSchema>;

/** Checkout: cotizar (envío + cupón) y cerrar el pedido reservando el stock. */
export class CheckoutService {
  constructor(
    private readonly cart: CartService,
    private readonly shipping: ShippingService,
    private readonly coupons: CouponService,
    private readonly orders: OrderRepository,
    private readonly storage: ImageStorage,
    private readonly clock: () => Date = () => new Date(),
    private readonly newToken: () => string = () => randomBytes(18).toString("base64url"),
  ) {}

  async shippingOptions(owner: CartOwner | null, postalCode?: string): Promise<ShippingOptions> {
    const view = await this.cart.view(owner);
    return this.shipping.options(postalCode, view.subtotalCents);
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
    const totals = computeTotals({ subtotalCents: view.subtotalCents, shippingCents, discountCents, freeShipping });
    return { lines: view.lines, ...totals, coupon, couponError, freeShippingFromCents: FREE_SHIPPING_FROM_CENTS };
  }

  async place(owner: CartOwner | null, userId: string | null, input: PlaceOrder): Promise<PlacedOrder> {
    const snap = await this.cart.snapshot(owner);
    if (!snap.lines.length) throw new ValidationError("Tu bolsa está vacía");
    const subtotalCents = snap.lines.reduce((a, l) => a + l.priceCents * l.qty, 0);
    const s = input.shipping;
    if (s.method === "taller" && !this.shipping.validSlot(s.pickupSlot))
      throw new ValidationError("Ese horario de retiro ya no está disponible, elegí otro");
    const postalCode = s.method === "taller" ? undefined : s.postalCode;
    const branch = await sucursalOf(this.shipping, s);
    const shippingCents = (await this.shipping.cost(s.method, postalCode, subtotalCents)) ?? 0;

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
    const totals = computeTotals({ subtotalCents, shippingCents, discountCents, freeShipping });

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
      reservedUntil,
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
      detail: coupon ? `Con el cupón ${coupon.code}` : null,
      auto: true,
    });
    return {
      orderId: r.id,
      number: formatOrderNumber(r.number),
      accessToken,
      totalCents: totals.totalCents,
      reservedUntil: reservedUntil.toISOString(),
    };
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
    const totals = computeTotals({ subtotalCents: o.subtotalCents, shippingCents, discountCents, freeShipping });
    const ok = await this.orders.updateTotals(o.id, {
      discountCents: totals.discountCents,
      shippingCents: totals.shippingCents,
      totalCents: totals.totalCents,
      couponId: coupon?.id ?? null,
      couponCode: coupon?.code ?? null,
    });
    if (!ok) throw new ConflictError("Este pedido ya no espera pago: volvé a la bolsa");
    return {
      orderId: o.id,
      number: formatOrderNumber(o.number),
      accessToken: token,
      totalCents: totals.totalCents,
      reservedUntil: (o.reservedUntil ?? new Date()).toISOString(),
    };
  }

  /** Comprobante para la pantalla de éxito (sin cuenta: número + token). */
  async receipt(number: string, token: string): Promise<OrderReceipt> {
    return this.toReceipt(await findOwned(this.orders, number, token));
  }

  toReceipt(o: OrderRecord): OrderReceipt {
    return {
      number: formatOrderNumber(o.number),
      status: o.status,
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
      s.method === "domicilio"
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
