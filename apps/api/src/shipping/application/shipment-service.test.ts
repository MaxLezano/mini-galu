import { PlaceOrderInputSchema } from "@mini-galu/contracts";
import { PDFDocument } from "pdf-lib";
import { beforeEach, describe, expect, it } from "vitest";
import { CartService } from "../../cart/application/cart-service";
import { MemoryCarts, MemoryVariants, variant } from "../../cart/testing/in-memory";
import { CouponService } from "../../coupons/application/coupon-service";
import { MemoryCoupons } from "../../coupons/testing/in-memory";
import { AdminOrdersService } from "../../orders/application/admin-orders-service";
import { CheckoutService } from "../../orders/application/checkout-service";
import { OrderPayments } from "../../orders/application/order-payments";
import { OrderShipping } from "../../orders/application/order-shipping";
import { MemoryOrders } from "../../orders/testing/in-memory";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { FakeAndreani } from "../infrastructure/fake-andreani";
import { PdfLibMerger } from "../infrastructure/pdf-lib-merger";
import { SimulatedAndreaniRates } from "../infrastructure/simulated-andreani-rates";
import { MemoryShipments, MemoryShippingSettings } from "../testing/in-memory";
import { ShipmentService } from "./shipment-service";
import { ShippingService } from "./shipping-service";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const HOUR = 3_600_000;

let now: Date;
let orders: MemoryOrders;
let admin: AdminOrdersService;
let shipments: ShipmentService;
let changes: DomainEvent[];
let paidOrder: (shipping?: object) => Promise<{ number: string; orderId: string; accessToken: string }>;

beforeEach(() => {
  now = new Date("2026-10-05T11:00:00-03:00");
  const clock = () => now;
  const variants = new MemoryVariants([variant("maddie", "4", 9)]);
  orders = new MemoryOrders(variants);
  orders.clock = clock;
  const bus = new EventBus();
  changes = [];
  bus.on("OrderStatusChanged", (e) => void changes.push(e));
  const cart = new CartService(new MemoryCarts(), variants, storage, orders);
  const shipping = new ShippingService(new SimulatedAndreaniRates());
  const checkout = new CheckoutService(cart, shipping, new CouponService(new MemoryCoupons()), orders, storage);
  const payments = new OrderPayments(orders, cart, new CouponService(new MemoryCoupons()), bus, clock);
  admin = new AdminOrdersService(
    orders,
    storage,
    bus,
    () => "Jue 8 · 10 a 13 h",
    (n, t) => `/pagar/${n}?t=${t}`,
    clock,
  );
  shipments = new ShipmentService(
    new FakeAndreani(clock),
    new MemoryShipments(clock),
    new OrderShipping(orders, storage, bus, async () => "Villa Crespo, CABA"),
    (n, t) => `http://web/pagar/${n}?t=${t}`,
    new MemoryShippingSettings(),
    "fake",
    new PdfLibMerger(),
    clock,
  );
  let k = 0;
  paidOrder = async (s) => {
    const token = `c${k++}`;
    await cart.add({ token }, { slug: "maddie", size: "4", qty: 1 });
    const placed = await checkout.place(
      { token },
      null,
      PlaceOrderInputSchema.parse({
        contact: { email: "lucia@gmail.com", firstName: "Lucía", lastName: "Fernández", phone: "11 5555-1234" },
        shipping: s ?? {
          method: "domicilio",
          postalCode: "1414",
          province: "CABA",
          street: "Gurruchaga",
          number: "1234",
          city: "Palermo",
        },
      }),
    );
    await payments.approved(placed.orderId, { method: "credito", installments: 3 });
    return placed;
  };
});

describe("envíos", () => {
  it("etiqueta → listo; Andreani lo retira → en camino; lo entrega → entregado", async () => {
    const o = await paidOrder();
    await expect(shipments.createLabel(o.number)).rejects.toBeInstanceOf(ConflictError); // todavía no se prepara
    await admin.move(o.number, "preparando");
    const { trackingNumber } = await shipments.createLabel(o.number);
    expect((await shipments.createLabel(o.number)).trackingNumber).toBe(trackingNumber); // no duplica
    expect(orders.items[0]?.status).toBe("listo");
    expect((await shipments.label(o.number)).filename).toBe(`etiqueta-${o.number}.pdf`);

    now = new Date(now.getTime() + 5 * HOUR);
    expect(await shipments.sync()).toBe(1);
    expect(orders.items[0]?.status).toBe("en_camino");
    now = new Date(now.getTime() + 60 * HOUR);
    await shipments.sync();
    expect(orders.items[0]?.status).toBe("entregado");
    expect(await shipments.sync()).toBe(0); // ya entregado: no se consulta más
    expect(changes.map((e) => e.payload.to)).toEqual(["preparando", "listo", "en_camino", "entregado"]);

    // seguimiento público, por número de pedido o de Andreani
    const t = await shipments.track(trackingNumber, null);
    expect(t).toMatchObject({
      number: o.number,
      status: "entregado",
      recipient: "Lucía F.",
      destination: "Palermo, CABA",
    });
    expect(t.stops.every((s) => s.done)).toBe(true);
    expect(t.log[0]?.title).toBe("Entregado");
    expect(JSON.stringify(t)).not.toContain("Gurruchaga"); // la calle no se muestra en una página pública
    expect((await shipments.track(o.number.toLowerCase(), null)).shipment?.trackingNumber).toBe(trackingNumber);
  });

  it("un retiro en el taller no lleva etiqueta y un número que no existe da 404", async () => {
    const slot = (await new ShippingService(new SimulatedAndreaniRates()).options(undefined, 0)).pickupSlots[0]?.id;
    const o = await paidOrder({ method: "taller", pickupSlot: slot });
    await admin.move(o.number, "preparando");
    await expect(shipments.createLabel(o.number)).rejects.toThrow("retira en el taller");
    expect((await shipments.track(o.number, null)).destination).toBe("El taller · Villa Crespo, CABA");
    await expect(shipments.track("MG-9999", null)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("sin pagar: el link para pagar solo aparece con el token del pedido", async () => {
    const o = await paidOrder();
    const record = orders.items[0];
    if (record) record.status = "esperando_pago";
    expect((await shipments.track(o.number, null)).payUrl).toBeNull();
    expect((await shipments.track(o.number, "otro")).payUrl).toBeNull();
    expect((await shipments.track(o.number, o.accessToken)).payUrl).toBe(
      `http://web/pagar/${o.number}?t=${o.accessToken}`,
    );
  });

  it("etiquetas de la selección: genera las que faltan y las imprime en un solo PDF", async () => {
    const lista = await paidOrder();
    const nueva = await paidOrder();
    const conEtiqueta = await paidOrder();
    const slot = (await new ShippingService(new SimulatedAndreaniRates()).options(undefined, 0)).pickupSlots[0]?.id;
    const taller = await paidOrder({ method: "taller", pickupSlot: slot });
    for (const o of [lista, conEtiqueta, taller]) await admin.move(o.number, "preparando");
    const { trackingNumber } = await shipments.createLabel(conEtiqueta.number);

    const r = await shipments.createLabels([lista.number, nueva.number, conEtiqueta.number, taller.number, "MG-9999"]);
    expect(r.labeled).toEqual([lista.number, conEtiqueta.number]);
    expect(r.skipped.map((s) => s.number)).toEqual([nueva.number, taller.number, "MG-9999"]);
    expect(r.skipped[1]?.reason).toContain("retira en el taller");
    expect(orders.items.find((o) => o.id === lista.orderId)?.status).toBe("listo");
    expect((await shipments.track(conEtiqueta.number, null)).shipment?.trackingNumber).toBe(trackingNumber); // no duplica

    const { filename, pdf } = await shipments.labels([lista.number, nueva.number, conEtiqueta.number, taller.number]);
    expect(filename).toBe("etiquetas-2.pdf");
    expect((await PDFDocument.load(pdf)).getPageCount()).toBe(2);
    await expect(shipments.labels([nueva.number, taller.number])).rejects.toBeInstanceOf(NotFoundError);
  });
});
