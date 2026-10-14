import { GiftcardPurchaseSchema, PlaceOrderInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { CartService } from "../../cart/application/cart-service";
import { MemoryCarts, MemoryVariants, variant } from "../../cart/testing/in-memory";
import { CouponService } from "../../coupons/application/coupon-service";
import { MemoryCoupons } from "../../coupons/testing/in-memory";
import { CheckoutService } from "../../orders/application/checkout-service";
import { OrderPayments } from "../../orders/application/order-payments";
import { MemoryOrders } from "../../orders/testing/in-memory";
import { ValidationError } from "../../shared/domain/errors";
import { EventBus } from "../../shared/events/event-bus";
import type { ImageStorage } from "../../shared/media/image-storage";
import { ShippingService } from "../../shipping/application/shipping-service";
import { FakeBranches } from "../../shipping/infrastructure/andreani-branches";
import { TableShippingRates } from "../../shipping/infrastructure/table-shipping-rates";
import { MemoryGiftcardMailer, MemoryGiftcards } from "../testing/in-memory";
import { GiftcardService } from "./giftcard-service";

const storage: ImageStorage = { url: (p) => `http://api/media/${p}`, save: async (p) => p };
const buyer = { email: "abu@gmail.com", firstName: "Marta", lastName: "Pérez", phone: "11 5555-1234" };
let now = new Date("2026-10-14T12:00:00-03:00");
const clock = () => now;

let orders: MemoryOrders;
let cards: MemoryGiftcards;
let mailer: MemoryGiftcardMailer;
let cart: CartService;
let checkout: CheckoutService;
let payments: OrderPayments;
let giftcards: GiftcardService;

const purchase = (over: Record<string, unknown> = {}) =>
  GiftcardPurchaseSchema.parse({
    design: "rosa",
    amountCents: 20_000_00,
    toName: "Ema",
    fromName: "La abuela",
    message: "¡Feliz cumple!",
    via: "mail",
    recipient: "Mama.de.Ema@gmail.com",
    deliverOn: null,
    buyer,
    ...over,
  });

/** Compra y paga una gift card; devuelve su código. */
async function bought(over: Record<string, unknown> = {}) {
  const g = await giftcards.buy(purchase(over));
  const o = await orders.findByNumber(Number(g.number.replace(/\D/g, "")));
  await payments.approved(o?.id ?? "", { method: "credito", installments: 1 });
  return cards.list.at(-1)?.code ?? "";
}

beforeEach(() => {
  now = new Date("2026-10-14T12:00:00-03:00");
  const variants = new MemoryVariants([variant("maddie", "4", 5)]);
  orders = new MemoryOrders(variants);
  orders.clock = clock;
  cards = new MemoryGiftcards();
  mailer = new MemoryGiftcardMailer();
  cart = new CartService(new MemoryCarts(), variants, storage, orders);
  const bus = new EventBus();
  const coupons = new CouponService(new MemoryCoupons(), clock);
  const wallet = {
    check: (c: string) => giftcards.check(c),
    checkById: (id: string) => giftcards.checkById(id),
    summary: (id: string) => giftcards.summary(id),
  };
  checkout = new CheckoutService(
    cart,
    new ShippingService(new TableShippingRates(), clock, new FakeBranches()),
    coupons,
    orders,
    storage,
    wallet,
    (id) => payments.approved(id, { method: "giftcard", installments: 1 }),
    clock,
  );
  payments = new OrderPayments(orders, cart, coupons, bus, clock);
  giftcards = new GiftcardService(
    cards,
    {
      create: (o) => checkout.placeGiftcard({ ...o.buyer }, o.amountCents),
      log: (id, title, detail) => orders.addEvent(id, { kind: "giftcard", title, detail, auto: true }),
      close: async (id) => void (await orders.setStatus(id, "nuevo", "entregado", now)),
      async find(id) {
        const o = await orders.findById(id);
        return (
          o && {
            kind: o.kind,
            email: o.email,
            firstName: o.firstName,
            giftcardId: o.giftcardId ?? null,
            giftcardCents: o.giftcardCents,
          }
        );
      },
    },
    mailer,
    clock,
  );
  bus.on("PaymentApproved", (e) => giftcards.paymentApproved(String(e.payload.orderId)));
});

const placeOrder = (giftcardCode: string) =>
  checkout.place(
    { token: "t1" },
    null,
    PlaceOrderInputSchema.parse({
      contact: { ...buyer, email: "mama.de.ema@gmail.com" },
      shipping: { method: "taller", pickupSlot: "2026-10-15T10-13" },
      giftcardCode,
    }),
  );

describe("gift cards", () => {
  it("se compra como un pedido sin prendas, se activa al pagarse y le llega a quien la recibe", async () => {
    const g = await giftcards.buy(purchase());
    expect(g.totalCents).toBe(20_000_00);
    const order = orders.items[0];
    expect(order).toMatchObject({ kind: "giftcard", items: [], totalCents: 20_000_00 });
    expect(await orders.listForBoard()).toHaveLength(0);
    expect(cards.list[0]).toMatchObject({ status: "esperando_pago", code: null, recipient: "mama.de.ema@gmail.com" });

    await payments.approved(order?.id ?? "", { method: "credito", installments: 1 });
    const code = cards.list[0]?.code ?? "";
    expect(code).toMatch(/^GALU-/);
    expect(cards.list[0]?.expiresAt?.toISOString()).toBe("2027-04-14T15:00:00.000Z");
    expect(order?.status).toBe("entregado");
    expect(mailer.sent).toEqual([
      { to: "abu@gmail.com", kind: "buyer", code },
      { to: "mama.de.ema@gmail.com", kind: "recipient", code },
    ]);
    // Mercado Pago avisa dos veces: no se activa ni se manda de nuevo
    await payments.approved(order?.id ?? "", { method: "credito", installments: 1 });
    expect(mailer.sent).toHaveLength(2);
    expect(await giftcards.balance(code.toLowerCase())).toMatchObject({ balanceCents: 20_000_00, usable: true });
  });

  it("si es para un día, sale ese día a las 9 (y por WhatsApp la manda quien la compró)", async () => {
    await bought({ deliverOn: "2026-10-20" });
    expect(mailer.sent.map((m) => m.kind)).toEqual(["buyer"]);
    expect(await giftcards.deliverDue()).toBe(0);
    now = new Date("2026-10-20T09:30:00-03:00");
    expect(await giftcards.deliverDue()).toBe(1);
    expect(mailer.sent.map((m) => m.kind)).toEqual(["buyer", "recipient"]);
    expect(await giftcards.deliverDue()).toBe(0);

    await bought({ via: "whatsapp", recipient: "11 4444-5555" });
    expect(cards.list[1]?.recipient).toBe("+5491144445555");
    expect(mailer.sent.at(-1)?.kind).toBe("buyer");
    expect(cards.list[1]?.deliveredAt).not.toBeNull();
  });

  it("paga parte de un pedido y el saldo queda para la próxima", async () => {
    const code = await bought({ amountCents: 10_000_00 });
    await cart.add({ token: "t1" }, { slug: "maddie", size: "4", qty: 1 }); // 38.000
    const q = await checkout.quote({ token: "t1" }, { method: "taller", giftcardCode: code });
    expect(q.giftcard).toEqual({ code, appliedCents: 10_000_00, balanceAfterCents: 0 });
    expect(q.totalCents).toBe(q.subtotalCents - 10_000_00);

    const placed = await placeOrder(code);
    expect(placed.paid).toBe(false);
    expect(cards.list[0]?.balanceCents).toBe(10_000_00); // se descuenta al pagarse
    await payments.approved(placed.orderId, { method: "credito", installments: 1 });
    expect(cards.list[0]?.balanceCents).toBe(0);
    await payments.approved(placed.orderId, { method: "credito", installments: 1 });
    expect(cards.redemptions).toHaveLength(1);
    await expect(placeOrder(code)).rejects.toThrow(ValidationError);
  });

  it("si cubre todo el pedido, queda pagado sin pasar por Mercado Pago", async () => {
    const code = await bought({ amountCents: 50_000_00 });
    await cart.add({ token: "t1" }, { slug: "maddie", size: "4", qty: 1 });
    const placed = await placeOrder(code);
    expect(placed).toMatchObject({ paid: true, totalCents: 0 });
    const o = await orders.findById(placed.orderId);
    expect(o).toMatchObject({ status: "nuevo", paymentMethod: "giftcard", giftcardCents: o?.subtotalCents });
    expect(cards.list[0]?.balanceCents).toBe(50_000_00 - (o?.subtotalCents ?? 0));
    expect(await giftcards.forEmail("Mama.de.Ema@gmail.com")).toMatchObject([{ mine: "recibi", code }]);
  });

  it("un código que no existe o vencido no se aplica", async () => {
    await cart.add({ token: "t1" }, { slug: "maddie", size: "4", qty: 1 });
    const q = await checkout.quote({ token: "t1" }, { method: "taller", giftcardCode: "GALU-AAAA-BBBB" });
    expect(q).toMatchObject({ giftcard: null, giftcardError: "No encontramos esa gift card" });
    const code = await bought();
    now = new Date("2027-05-01T12:00:00-03:00");
    const late = await checkout.quote({ token: "t1" }, { method: "taller", giftcardCode: code });
    expect(late.giftcardError).toContain("venció");
  });
});
