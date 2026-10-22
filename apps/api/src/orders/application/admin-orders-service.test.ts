import { PlaceOrderInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { CartService } from "../../cart/application/cart-service";
import { MemoryCarts, MemoryVariants, variant } from "../../cart/testing/in-memory";
import { CouponService } from "../../coupons/application/coupon-service";
import { MemoryCoupons } from "../../coupons/testing/in-memory";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { ShippingService } from "../../shipping/application/shipping-service";
import { SimulatedAndreaniRates } from "../../shipping/infrastructure/simulated-andreani-rates";
import { MemoryOrders } from "../testing/in-memory";
import { AdminOrdersService } from "./admin-orders-service";
import { CheckoutService } from "./checkout-service";
import { OrderPayments } from "./order-payments";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };

let orders: MemoryOrders;
let admin: AdminOrdersService;
let published: DomainEvent[];
let pay: (n: string) => Promise<void>;
let place: (token: string, shipping?: object) => Promise<{ number: string; orderId: string }>;
let stock: () => number | undefined;

beforeEach(() => {
  const variants = new MemoryVariants([variant("maddie", "4", 5)]);
  stock = () => variants.list[0]?.stock;
  orders = new MemoryOrders(variants);
  const cart = new CartService(new MemoryCarts(), variants, storage, orders);
  const coupons = new CouponService(new MemoryCoupons());
  const bus = new EventBus();
  published = [];
  bus.on("OrderStatusChanged", (e) => void published.push(e));
  const checkout = new CheckoutService(
    cart,
    new ShippingService(new SimulatedAndreaniRates()),
    coupons,
    orders,
    storage,
  );
  const payments = new OrderPayments(orders, cart, coupons, bus);
  admin = new AdminOrdersService(
    orders,
    storage,
    bus,
    (s) => `franja ${s}`,
    (n, t) => `http://web/pagar/${n}?t=${t}`,
  );
  place = async (token, shipping) => {
    await cart.add({ token }, { slug: "maddie", size: "4", qty: 1 });
    return checkout.place(
      { token },
      null,
      PlaceOrderInputSchema.parse({
        contact: { email: "lucia@gmail.com", firstName: "Lucía", lastName: "Fernández", phone: "11 5555-1234" },
        shipping: shipping ?? {
          method: "domicilio",
          postalCode: "1414",
          province: "CABA",
          street: "Gurruchaga",
          number: "1234",
          city: "CABA",
        },
      }),
    );
  };
  pay = async (orderId) => payments.approved(orderId, { method: "credito", installments: 3 });
});

describe("AdminOrdersService", () => {
  it("anular un pedido sin pagar: las prendas vuelven a la tienda y queda en el historial", async () => {
    const a = await place("a");
    expect(stock()).toBe(4);
    const d = await admin.cancel(a.number, "  lo armé por error ");
    expect(d.status).toBe("cancelado");
    expect(stock()).toBe(5);
    expect(d.events[0]).toMatchObject({
      kind: "cancelled",
      title: "Anulado por el taller",
      detail: '"lo armé por error" · las prendas volvieron a la tienda',
    });
    // ya no espera pago: ni otra vez ni pagarlo
    await expect(admin.cancel(a.number, "")).rejects.toThrow("ya no espera pago");
  });

  it("un pedido pagado no se anula: se reintegra", async () => {
    const a = await place("a");
    await pay(a.orderId);
    await expect(admin.cancel(a.number, "")).rejects.toBeInstanceOf(ConflictError);
    await expect(admin.cancel(a.number, "")).rejects.toThrow("reintegrá el pago");
    expect(stock()).toBe(4);
  });

  it("el tablero muestra los pagados y no los checkouts web sin pagar", async () => {
    const a = await place("a");
    await place("b");
    await pay(a.orderId);
    const list = await admin.list();
    expect(list.map((o) => [o.number, o.status])).toEqual([[a.number, "nuevo"]]);
    expect(list[0]).toMatchObject({ customer: { name: "Lucía Fernández", city: "CABA" }, units: 1, channel: "web" });
  });

  it("el detalle trae contacto, envío e historial", async () => {
    const a = await place("a");
    await pay(a.orderId);
    const d = await admin.detail(a.number);
    expect(d).toMatchObject({
      phone: "+5491155551234",
      shippingAddress: { street: "Gurruchaga" },
      paymentMethod: "credito",
    });
    expect(d.events.map((e) => e.kind)).toEqual(["paid", "created"]);
    await expect(admin.detail("MG-9999")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("'Te queda': pregunta lo que acreditó Mercado Pago solo si no lo sabe y el pago sigue aprobado", async () => {
    const asked: string[] = [];
    const withNet = new AdminOrdersService(
      orders,
      storage,
      new EventBus(),
      () => null,
      () => "",
      undefined,
      undefined,
      async (p) => {
        asked.push(p.reference);
        return 9_590_00;
      },
    );
    const a = await place("a");
    await pay(a.orderId);
    expect((await withNet.detail(a.number)).payment).toBeNull();
    const mp = { provider: "mercadopago", reference: "ORD1", status: "processed", paidByCustomerCents: null };
    orders.payments.set(a.orderId, { ...mp, netCents: null });
    expect((await withNet.detail(a.number)).payment?.netCents).toBe(9_590_00);
    orders.payments.set(a.orderId, { ...mp, netCents: 9_500_00 });
    expect((await withNet.detail(a.number)).payment?.netCents).toBe(9_500_00);
    orders.payments.set(a.orderId, { ...mp, status: "refunded", netCents: null });
    expect((await withNet.detail(a.number)).payment?.netCents).toBeNull();
    expect(asked).toEqual(["ORD1"]);
  });

  it("mueve de estado, deja historial y avisa con un evento", async () => {
    const a = await place("a");
    await pay(a.orderId);
    const d = await admin.move(a.number, "preparando");
    expect(d.status).toBe("preparando");
    expect(d.events[0]).toMatchObject({ kind: "status", title: "En preparación", auto: false });
    expect(published[0]?.payload).toMatchObject({ from: "nuevo", to: "preparando" });
    await expect(admin.move(a.number, "esperando_pago")).rejects.toBeInstanceOf(ConflictError);
  });

  it("entregado: el detalle trae el link para que el cliente deje su reseña", async () => {
    const withReview = new AdminOrdersService(
      orders,
      storage,
      new EventBus(),
      () => null,
      () => "",
      undefined,
      undefined,
      undefined,
      (n, t) => `http://web/resena/${n}?t=${t}`,
    );
    const slot = (await new ShippingService(new SimulatedAndreaniRates()).options(undefined, 0)).pickupSlots[0]?.id;
    const a = await place("a", { method: "taller", pickupSlot: slot });
    await pay(a.orderId);
    expect((await withReview.detail(a.number)).reviewUrl).toBeNull();
    await withReview.move(a.number, "listo");
    const d = await withReview.move(a.number, "entregado");
    expect(d.reviewUrl).toMatch(new RegExp(`^http://web/resena/${a.number}\\?t=.+`));
  });

  it("no mueve un pedido sin pagar ni manda a 'en camino' un retiro en el taller", async () => {
    const a = await place("a");
    await expect(admin.move(a.number, "preparando")).rejects.toThrow("no está pagado");
    const slot = (await new ShippingService(new SimulatedAndreaniRates()).options(undefined, 0)).pickupSlots[0]?.id;
    const b = await place("b", { method: "taller", pickupSlot: slot });
    await pay(b.orderId);
    await admin.move(b.number, "listo");
    await expect(admin.move(b.number, "en_camino")).rejects.toThrow("retira en el taller");
    expect((await admin.detail(b.number)).pickupLabel).toBe(`franja ${slot}`);
  });

  it("avanza en lote: cada uno a su siguiente paso", async () => {
    const a = await place("a");
    const b = await place("b");
    await pay(a.orderId);
    await pay(b.orderId);
    await admin.move(b.number, "listo");
    const r = await admin.advance([a.number, b.number, "MG-9999"]);
    expect(r.moved).toEqual([a.number, b.number]);
    expect(r.skipped).toEqual([{ number: "MG-9999", reason: "No existe ese pedido" }]);
    expect((await admin.detail(a.number)).status).toBe("preparando");
    expect((await admin.detail(b.number)).status).toBe("en_camino");
  });

  it("guarda la nota interna", async () => {
    const a = await place("a");
    await pay(a.orderId);
    await admin.saveNote(a.number, "  envolver con cuidado  ");
    expect((await admin.detail(a.number)).internalNote).toBe("envolver con cuidado");
    await admin.saveNote(a.number, "");
    expect((await admin.detail(a.number)).internalNote).toBeNull();
  });

  it("resumen del día: tareas, ventas del mes y lo que se hizo solo", async () => {
    const a = await place("a");
    const slot = (await new ShippingService(new SimulatedAndreaniRates()).options(undefined, 0)).pickupSlots[0]?.id;
    const b = await place("b", { method: "taller", pickupSlot: slot });
    await place("c"); // sin pagar: no cuenta ni vende
    await pay(a.orderId);
    await pay(b.orderId);
    await admin.move(b.number, "preparando");
    await admin.move(b.number, "listo");
    const s = await admin.summary();
    expect(s.todo).toEqual({ toPrepare: 1, toShip: 0, toPickup: 1, awaitingPayment: 0 });
    const total = orders.items.filter((o) => o.paidAt).reduce((t, o) => t + o.totalCents, 0);
    expect(s.month).toMatchObject({ orders: 2, salesCents: total, returning: 1 }); // la segunda compra de Lucía
    expect(s.weeks).toHaveLength(8);
    expect(s.months).toHaveLength(12);
    expect(s.weeks.at(-1)?.cents).toBe(total);
    expect(s.recent.map((o) => o.number).sort()).toEqual([a.number, b.number].sort());
    expect(s.feed.every((e) => e.kind === "paid")).toBe(true);
    expect(s.feed[0]).toMatchObject({ customer: "Lucía Fernández" });
  });
});
