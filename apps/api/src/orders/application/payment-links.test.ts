import { PaymentLinkInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { CartService } from "../../cart/application/cart-service";
import { MemoryCarts, MemoryVariants, variant } from "../../cart/testing/in-memory";
import { CouponService } from "../../coupons/application/coupon-service";
import { MemoryCoupons } from "../../coupons/testing/in-memory";
import { ConflictError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { ShippingService } from "../../shipping/application/shipping-service";
import { TableShippingRates } from "../../shipping/infrastructure/table-shipping-rates";
import { MemoryOrders } from "../testing/in-memory";
import { AdminOrdersService } from "./admin-orders-service";
import { OrderPayments } from "./order-payments";
import { PaymentLinks } from "./payment-links";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const HOUR = 3_600_000;

let now: Date;
let variants: MemoryVariants;
let orders: MemoryOrders;
let links: PaymentLinks;
let payments: OrderPayments;
let admin: AdminOrdersService;
let reminders: DomainEvent[];

const input = (qty = 1) =>
  PaymentLinkInputSchema.parse({
    channel: "whatsapp",
    contact: { email: "paula@gmail.com", firstName: "Paula", lastName: "Benítez", phone: "11 5555-1234" },
    shipping: {
      method: "domicilio",
      postalCode: "1414",
      province: "CABA",
      street: "Gurruchaga",
      number: "1",
      city: "CABA",
    },
    items: [{ slug: "elsa", size: "4", qty }],
  });

beforeEach(() => {
  now = new Date("2026-10-13T12:00:00Z");
  const clock = () => now;
  variants = new MemoryVariants([variant("elsa", "4", 2)]);
  orders = new MemoryOrders(variants);
  const bus = new EventBus();
  reminders = [];
  bus.on("PaymentLinkReminder", (e) => void reminders.push(e));
  const shipping = new ShippingService(new TableShippingRates());
  links = new PaymentLinks(
    variants,
    shipping,
    orders,
    bus,
    "http://web",
    async () => true,
    clock,
    () => "tok",
  );
  const cart = new CartService(new MemoryCarts(), variants, storage, orders);
  payments = new OrderPayments(orders, cart, new CouponService(new MemoryCoupons()), bus, clock);
  admin = new AdminOrdersService(
    orders,
    storage,
    bus,
    () => null,
    (n, t) => `http://web/pagar/${n}?t=${t}`,
    clock,
  );
});

describe("links de pago", () => {
  it("crea el pedido por WhatsApp esperando pago, reserva el stock 72 h y da el link para pagar", async () => {
    const r = await links.create(input());
    expect(r.payUrl).toBe(`http://web/pagar/${r.number}?t=tok`);
    expect(r.reservedUntil).toBe(new Date(now.getTime() + 72 * HOUR).toISOString());
    expect(variants.list[0]?.stock).toBe(1);
    const o = orders.items[0];
    expect(o).toMatchObject({ status: "esperando_pago", channel: "whatsapp", cartId: null });
    expect(o?.totalCents).toBe((o?.subtotalCents ?? 0) + (o?.shippingCents ?? 0));
    // aparece en el tablero (columna "esperando pago") y el detalle tiene el link
    expect((await admin.list()).map((x) => x.number)).toEqual([r.number]);
    expect((await admin.detail(r.number)).payUrl).toBe(r.payUrl);
    expect((await admin.detail(r.number)).events[0]?.title).toBe("Link de pago generado para WhatsApp");
  });

  it("sin stock suficiente no crea nada", async () => {
    await expect(links.create(input(3))).rejects.toBeInstanceOf(ConflictError);
    expect(orders.items).toHaveLength(0);
    expect(variants.list[0]?.stock).toBe(2);
  });

  it("recuerda una sola vez a las 24 h y libera el stock a las 72 h", async () => {
    orders.items.length = 0;
    const r = await links.create(input());
    const o = orders.items[0];
    if (o) o.createdAt = now; // en memoria la fecha de creación es la real
    now = new Date(now.getTime() + 23 * HOUR);
    expect(await links.remindUnpaid()).toBe(0);
    now = new Date(now.getTime() + 2 * HOUR);
    expect(await links.remindUnpaid()).toBe(1);
    expect(await links.remindUnpaid()).toBe(0);
    expect(reminders[0]?.payload).toMatchObject({ number: r.number, email: "paula@gmail.com", payUrl: r.payUrl });

    now = new Date(now.getTime() + 48 * HOUR);
    expect(await payments.releaseExpired()).toBe(1);
    expect(variants.list[0]?.stock).toBe(2);
    expect(o?.status).toBe("cancelado");
  });

  it("pagado, deja de mostrar el link", async () => {
    const r = await links.create(input());
    await payments.approved(orders.items[0]?.id ?? "", { method: "credito", installments: 1 });
    expect((await admin.detail(r.number)).payUrl).toBeNull();
  });
});
