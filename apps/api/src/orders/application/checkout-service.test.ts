import { DEFAULT_POLICIES, type PlaceOrderInput, PlaceOrderInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { CartService } from "../../cart/application/cart-service";
import { MemoryCarts, MemoryVariants, variant } from "../../cart/testing/in-memory";
import { CouponService } from "../../coupons/application/coupon-service";
import { MemoryCoupons } from "../../coupons/testing/in-memory";
import { ConflictError, NotFoundError, ValidationError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { ShippingService } from "../../shipping/application/shipping-service";
import { FakeBranches } from "../../shipping/infrastructure/andreani-branches";
import { SimulatedAndreaniRates } from "../../shipping/infrastructure/simulated-andreani-rates";
import { MemoryOrders } from "../testing/in-memory";
import { type CheckoutGiftcards, CheckoutService } from "./checkout-service";
import { OrderPayments } from "./order-payments";

/** Con envío gratis desde $90.000 prendido (en la base de la tienda está apagado). */
const policies = { get: async () => ({ ...DEFAULT_POLICIES, freeShipping: { enabled: true, fromCents: 90_000_00 } }) };

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const guest = { token: "t1" };
let now = new Date("2026-10-07T12:00:00-03:00");
const clock = () => now;

let variants: MemoryVariants;
let orders: MemoryOrders;
let coupons: MemoryCoupons;
let cart: CartService;
let checkout: CheckoutService;
let payments: OrderPayments;
let events: DomainEvent[];

const order = (over: Partial<PlaceOrderInput> = {}) =>
  PlaceOrderInputSchema.parse({
    contact: { email: "lucia@gmail.com", firstName: "Lucía", lastName: "Fernández", phone: "11 5555-1234" },
    shipping: {
      method: "domicilio",
      postalCode: "1414",
      province: "CABA",
      street: "Gurruchaga",
      number: "1234",
      unit: "3° B",
      city: "CABA",
    },
    ...over,
  });

beforeEach(async () => {
  now = new Date("2026-10-07T12:00:00-03:00");
  variants = new MemoryVariants([variant("maddie", "4", 2), variant("elsa", "2", 1, { priceCents: 30_000_00 })]);
  orders = new MemoryOrders(variants);
  coupons = new MemoryCoupons();
  cart = new CartService(new MemoryCarts(), variants, storage, orders);
  const bus = new EventBus();
  events = [];
  for (const t of ["PaymentApproved", "OrderExpired", "PaymentNeedsRefund"]) bus.on(t, (e) => void events.push(e));
  const couponService = new CouponService(coupons, clock);
  checkout = new CheckoutService(
    cart,
    new ShippingService(new SimulatedAndreaniRates(), clock, new FakeBranches(), policies),
    couponService,
    orders,
    storage,
    undefined,
    undefined,
    clock,
    () => "tok",
  );
  payments = new OrderPayments(orders, cart, couponService, bus, clock);
  await cart.add(guest, { slug: "maddie", size: "4", qty: 1 });
});

describe("CheckoutService", () => {
  it("envío a sucursal: se muestra la del CP, se guarda la elegida y se rechaza una que no es del CP", async () => {
    const opts = await checkout.shippingOptions(guest, "1414");
    expect(opts.branches[0]).toMatchObject({ id: "10010", name: "Palermo (Av Scalabrini Ortiz)" });
    expect(opts.options.find((o) => o.method === "sucursal")?.detail).toBe(
      "Sucursal Palermo (Av Scalabrini Ortiz) · Raúl Scalabrini Ortiz 615 · C.a.b.a.",
    );
    const sucursal = (branchId: string) =>
      order({ shipping: { method: "sucursal", postalCode: "1414", province: "CABA", branchId } as never });
    await expect(checkout.place(guest, null, sucursal("999"))).rejects.toThrow("Esa sucursal no está disponible");
    const placed = await checkout.place(guest, null, sucursal("10020"));
    expect(orders.items[0]?.shippingBranch).toMatchObject({ id: "10020", name: "Caballito (Av Rivadavia)" });
    expect((await checkout.receipt(placed.number, placed.accessToken)).branchLabel).toContain("Caballito");
  });

  it("cotiza el envío de la bolsa más la prenda que se está mirando (envío gratis incluido)", async () => {
    const domicilio = async (extra?: number) =>
      (await checkout.shippingOptions(guest, "1414", extra)).options.find((o) => o.method === "domicilio")?.cents;
    expect(await domicilio()).toBeGreaterThan(0);
    expect(await domicilio(90_000_00)).toBe(0);
    expect((await checkout.shippingOptions(guest, undefined, 90_000_00)).options[0]?.cents).toBeNull();
  });

  it("cotiza envío por CP y aplica el cupón sin cortar la compra si no sirve", async () => {
    await coupons.create({
      code: "OTONO10",
      kind: "percent",
      value: 10,
      minSubtotalCents: null,
      audience: "todos",
      endsAt: null,
      maxUses: null,
      oncePerCustomer: true,
      active: true,
    });
    const q = await checkout.quote(guest, {
      method: "domicilio",
      postalCode: "1414",
      couponCode: "otono10",
      email: "a@b.co",
    });
    expect(q).toMatchObject({ subtotalCents: 38_000_00, discountCents: 3_800_00, shippingCents: 8_900_00 });
    expect(q.totalCents).toBe(38_000_00 - 3_800_00 + 8_900_00);
    const bad = await checkout.quote(guest, { method: "taller", couponCode: "NADA" });
    expect(bad).toMatchObject({ shippingCents: 0, couponError: "Ese código no existe", coupon: null });
  });

  it("envío gratis desde $90.000", async () => {
    await cart.add(guest, { slug: "maddie", size: "4", qty: 1 });
    await cart.add(guest, { slug: "elsa", size: "2", qty: 1 });
    expect((await checkout.quote(guest, { method: "domicilio", postalCode: "5000" })).shippingCents).toBe(0);
  });

  it("crear el pedido reserva el stock y queda esperando pago", async () => {
    const p = await checkout.place(guest, null, order());
    expect(p).toMatchObject({ number: "MG-1001", accessToken: "tok", totalCents: 38_000_00 + 8_900_00 });
    expect(variants.list[0]?.stock).toBe(1);
    const r = await checkout.receipt("MG-1001", "tok");
    expect(r).toMatchObject({ status: "esperando_pago", firstName: "Lucía", shippingMethod: "domicilio" });
    await expect(checkout.receipt("MG-1001", "otro")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("avisos por WhatsApp desde el seguimiento: se apagan y prenden con el token del pedido", async () => {
    await checkout.place(guest, null, order());
    await checkout.whatsappNotices("MG-1001", "tok", false);
    expect(orders.items[0]?.whatsappOptIn).toBe(false);
    await checkout.whatsappNotices("MG-1001", "tok", true);
    expect(orders.items[0]?.whatsappOptIn).toBe(true);
    await expect(checkout.whatsappNotices("MG-1001", "otro", false)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("envío a acordar y cadete: guardan la dirección y no cobran envío; el cadete solo en la ciudad del taller", async () => {
    const dir = {
      postalCode: "4000",
      province: "Tucumán" as const,
      street: "Laprida",
      number: "580",
      city: "San Miguel de Tucumán",
    };
    const p = await checkout.place(guest, null, order({ shipping: { method: "acordar", ...dir } }));
    expect(p.totalCents).toBe(38_000_00);
    expect(orders.items[0]).toMatchObject({
      shippingMethod: "acordar",
      shippingCents: 0,
      shippingAddress: { street: "Laprida", city: "San Miguel de Tucumán" },
    });
    expect((await checkout.place(guest, null, order({ shipping: { method: "cadete", ...dir } }))).totalCents).toBe(
      38_000_00,
    );
    await expect(
      checkout.place(
        guest,
        null,
        order({ shipping: { method: "cadete", ...dir, postalCode: "1414", province: "CABA" } }),
      ),
    ).rejects.toThrow("El cadete llega solo dentro de San Miguel de Tucumán");
  });

  it("si se vuelve a pedir desde la misma bolsa, el pedido anterior se cancela y devuelve el stock", async () => {
    await checkout.place(guest, null, order());
    await checkout.place(guest, null, order());
    expect(orders.items.map((o) => o.status)).toEqual(["cancelado", "esperando_pago"]);
    expect(variants.list[0]?.stock).toBe(1);
  });

  it("la reserva propia no achica la bolsa: volver a pedir con todo el stock en la bolsa cobra lo mismo", async () => {
    // caso real (MG-1008 → MG-1009): la bolsa tenía todo el stock de un talle
    await cart.add(guest, { slug: "maddie", size: "4", qty: 1 }); // 2 de 2
    const first = await checkout.place(guest, null, order());
    expect(variants.list[0]?.stock).toBe(0);
    const view = await cart.view(guest);
    expect(view.lines[0]).toMatchObject({ qty: 2, maxStock: 2 });
    const again = await checkout.place(guest, null, order());
    expect(again.totalCents).toBe(first.totalCents);
    expect(orders.items.map((o) => o.status)).toEqual(["cancelado", "esperando_pago"]);
    expect(variants.list[0]?.stock).toBe(0);
  });

  it("si otra persona compró el último talle mientras tanto, avisa sin crear el pedido", async () => {
    const snapshot = cart.snapshot.bind(cart);
    cart.snapshot = async (o) => {
      const s = await snapshot(o);
      variants.setStock("maddie-4", 0); // la otra compra entra justo después de leer la bolsa
      return s;
    };
    await expect(checkout.place(guest, null, order())).rejects.toThrow("Se acaba de agotar el maddie en talle 4");
    expect(orders.items).toHaveLength(0);
  });

  it("valida bolsa vacía, horario de retiro y cupón inválido", async () => {
    await expect(checkout.place({ token: "vacia" }, null, order())).rejects.toBeInstanceOf(ValidationError);
    await expect(
      checkout.place(guest, null, order({ shipping: { method: "taller", pickupSlot: "2026-10-07T10-13" } })),
    ).rejects.toThrow("horario");
    await expect(checkout.place(guest, null, order({ couponCode: "NADA" }))).rejects.toThrow("no existe");
    const ok = await checkout.place(
      guest,
      null,
      order({ shipping: { method: "taller", pickupSlot: "2026-10-08T10-13" } }),
    );
    expect(ok.totalCents).toBe(38_000_00);
  });
});

describe("CheckoutService.changeCoupon", () => {
  const otono = {
    code: "OTONO10",
    kind: "percent" as const,
    value: 10,
    minSubtotalCents: null,
    audience: "todos" as const,
    endsAt: null,
    maxUses: null,
    oncePerCustomer: true,
    active: true,
  };

  it("aplica y quita el cupón sobre el mismo pedido, sin soltar la reserva", async () => {
    await coupons.create(otono);
    const placed = await checkout.place(guest, null, order());
    const withCoupon = await checkout.changeCoupon(placed.number, "tok", "otono10");
    expect(withCoupon).toMatchObject({ number: placed.number, totalCents: 38_000_00 - 3_800_00 + 8_900_00 });
    expect(orders.items).toHaveLength(1);
    expect(orders.items[0]).toMatchObject({ couponCode: "OTONO10", discountCents: 3_800_00, status: "esperando_pago" });
    expect(variants.list[0]?.stock).toBe(1);
    const without = await checkout.changeCoupon(placed.number, "tok", null);
    expect(without.totalCents).toBe(placed.totalCents);
    expect(orders.items[0]).toMatchObject({ couponCode: null, discountCents: 0 });
  });

  it("rechaza cupones inválidos, tokens ajenos y pedidos ya pagados", async () => {
    const placed = await checkout.place(guest, null, order());
    await expect(checkout.changeCoupon(placed.number, "tok", "NADA")).rejects.toThrow("no existe");
    await expect(checkout.changeCoupon(placed.number, "otro", null)).rejects.toBeInstanceOf(NotFoundError);
    await payments.approved(placed.orderId, { method: "credito", installments: 1 });
    await expect(checkout.changeCoupon(placed.number, "tok", null)).rejects.toThrow("ya no espera pago");
  });
});

describe("OrderPayments", () => {
  it("pago aprobado: pedido nuevo, bolsa vacía, cupón usado y evento (una sola vez)", async () => {
    const c = await new CouponService(coupons, clock).create({
      code: "OTONO10",
      kind: "percent",
      value: 10,
      minSubtotalCents: null,
      audience: "todos",
      endsAt: null,
      maxUses: null,
      oncePerCustomer: true,
      active: true,
    });
    const p = await checkout.place(guest, null, order({ couponCode: "OTONO10" }));
    await payments.approved(p.orderId, { method: "credito", installments: 6 });
    await payments.approved(p.orderId, { method: "credito", installments: 6 });
    expect(orders.items[0]).toMatchObject({ status: "nuevo", paymentMethod: "credito", installments: 6 });
    expect(orders.unitsSold.get("maddie")).toBe(1);
    expect((await cart.view(guest)).count).toBe(0);
    expect((await coupons.findById(c.id))?.timesUsed).toBe(1);
    expect(events.map((e) => e.type)).toEqual(["PaymentApproved"]);
    await expect(payments.payable("MG-1001", "tok")).rejects.toThrow("ya está pagado");
  });

  it("libera el stock de los pedidos que no se pagaron a tiempo", async () => {
    await checkout.place(guest, null, order());
    now = new Date(now.getTime() + 31 * 60_000);
    await expect(payments.payable("MG-1001", "tok")).rejects.toThrow("venció");
    expect(await payments.releaseExpired()).toBe(1);
    expect(variants.list[0]?.stock).toBe(2);
    expect(events.map((e) => e.type)).toEqual(["OrderExpired"]);
  });

  it("si el pago llega después de vencer: reserva de nuevo si hay stock, si no pide reembolso", async () => {
    const a = await checkout.place(guest, null, order());
    now = new Date(now.getTime() + 31 * 60_000);
    await payments.releaseExpired();
    await payments.approved(a.orderId, { method: "debito", installments: 1 });
    expect(orders.items[0]?.status).toBe("nuevo");
    expect(variants.list[0]?.stock).toBe(1);

    await cart.add({ token: "b" }, { slug: "elsa", size: "2", qty: 1 });
    const b = await checkout.place({ token: "b" }, null, order());
    now = new Date(now.getTime() + 31 * 60_000);
    await payments.releaseExpired();
    variants.setStock("elsa-2", 0);
    await payments.approved(b.orderId, { method: "credito", installments: 1 });
    expect(orders.items[1]?.status).toBe("cancelado");
    expect(events.at(-1)?.type).toBe("PaymentNeedsRefund");
  });

  it("dos pedidos a la vez con la misma gift card que cubre todo: el segundo se cancela en vez de salir gratis", async () => {
    // el saldo que ve el checkout es el de antes de la primera compra (las dos se validan al mismo tiempo)
    let balance = 50_000_00;
    const used = new Set<string>();
    const giftcards: CheckoutGiftcards = {
      check: async () => ({ id: "g1", code: "GALU-AAAA-BBBB", balanceCents: 50_000_00 }),
      checkById: async () => ({ id: "g1", code: "GALU-AAAA-BBBB", balanceCents: balance }),
      summary: async () => null,
      redeem: async (orderId, _id, cents) => {
        if (used.has(orderId)) return "repetido";
        if (balance < cents) return "sin_saldo";
        balance -= cents;
        used.add(orderId);
        return "ok";
      },
    };
    const settled: string[] = [];
    const withCard = new CheckoutService(
      cart,
      new ShippingService(new SimulatedAndreaniRates(), clock, new FakeBranches(), policies),
      new CouponService(coupons, clock),
      orders,
      storage,
      giftcards,
      async (id) => void settled.push(id),
      clock,
      () => "tok",
    );
    const other = { token: "t2" };
    await cart.add(other, { slug: "maddie", size: "4", qty: 1 });
    const pickup = order({
      giftcardCode: "GALU-AAAA-BBBB",
      shipping: { method: "taller", pickupSlot: "2026-10-08T10-13" },
    });

    const first = await withCard.place(guest, null, pickup);
    expect(first).toMatchObject({ paid: true, totalCents: 0 });
    expect(settled).toEqual([first.orderId]);

    await expect(withCard.place(other, null, pickup)).rejects.toBeInstanceOf(ConflictError);
    expect(settled).toHaveLength(1);
    expect(orders.items[1]?.status).toBe("cancelado");
    expect((await variants.find("maddie", "4"))?.stock).toBe(1);
  });
});
