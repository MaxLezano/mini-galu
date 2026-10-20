import { beforeEach, describe, expect, it } from "vitest";
import { MemoryVariants, variant } from "../../cart/testing/in-memory";
import { OrderRefunds } from "../../orders/application/order-refunds";
import type { NewOrder } from "../../orders/application/ports";
import { MemoryOrders, MemoryRefundGiftcards } from "../../orders/testing/in-memory";
import { ConflictError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import { SimulatedGateway } from "../infrastructure/simulated-gateway";
import { type PaymentGateway, RefundRejected } from "./ports";
import { RefundService } from "./refund-service";

let variants: MemoryVariants;
let orders: MemoryOrders;
let giftcards: MemoryRefundGiftcards;
let gateway: PaymentGateway;
let refunded: string[];
let events: DomainEvent[];
let calls: { paymentId: string; idempotencyKey: string }[];
let service: () => RefundService;

const order = (over: Partial<NewOrder> = {}): NewOrder => ({
  cartId: null,
  userId: null,
  accessToken: "tok",
  email: "lucia@gmail.com",
  firstName: "Lucía",
  lastName: "F",
  phone: "+5491155551234",
  whatsappOptIn: false,
  shippingMethod: "domicilio",
  shippingAddress: null,
  shippingBranch: null,
  postalCode: "1414",
  province: "CABA",
  pickupSlot: null,
  subtotalCents: 40_000_00,
  discountCents: 0,
  shippingCents: 5_000_00,
  totalCents: 45_000_00,
  couponId: null,
  couponCode: null,
  reservedUntil: new Date(Date.now() + 60_000),
  items: [
    {
      variantId: "maddie-4",
      productSlug: "maddie",
      name: "Maddie",
      colorName: "Rosa",
      size: "4",
      imagePath: null,
      unitPriceCents: 40_000_00,
      qty: 1,
    },
  ],
  ...over,
});

/** Un pedido pagado con Mercado Pago (pago `sim-1`). */
async function paid(over: Partial<NewOrder> = {}, payment = true) {
  const r = await orders.createReserving(order(over));
  if (!r.ok) throw new Error("sin stock");
  await orders.markPaid(r.id, { method: "credito", installments: 1, at: new Date() });
  if (payment)
    orders.payments.set(r.id, {
      provider: "simulado",
      reference: "sim-1",
      status: "approved",
      paidByCustomerCents: null,
      netCents: null,
    });
  return { id: r.id, number: `MG-${r.number}` };
}

beforeEach(() => {
  variants = new MemoryVariants([variant("maddie", "4", 3)]);
  orders = new MemoryOrders(variants);
  giftcards = new MemoryRefundGiftcards();
  const sim = new SimulatedGateway();
  calls = [];
  gateway = sim;
  sim.refund = async (req) => {
    calls.push(req);
    return { pending: false };
  };
  refunded = [];
  events = [];
  const bus = new EventBus();
  bus.on("OrderRefunded", (e) => void events.push(e));
  service = () =>
    new RefundService(
      gateway,
      { record: async () => {}, markRefunded: async (_p, id) => void refunded.push(id), saveNet: async () => {} },
      new OrderRefunds(orders, giftcards, bus),
      () => "k",
    );
});

const stock = () => variants.list[0]?.stock;

describe("reintegro desde el panel", () => {
  it("devuelve el total por Mercado Pago, pasa a reembolsado y las prendas vuelven al stock", async () => {
    const o = await paid();
    expect(stock()).toBe(2);
    const r = await service().refund(o.number, { restock: true, reason: "arrepentimiento" });
    expect(r).toEqual({ cents: 45_000_00, giftcardCents: 0, pending: false });
    expect(calls).toEqual([{ paymentId: "sim-1", idempotencyKey: `${o.id}:k` }]);
    expect(refunded).toEqual(["sim-1"]);
    expect(orders.items[0]?.status).toBe("reembolsado");
    expect(stock()).toBe(3);
    expect(orders.unitsSold.get("maddie")).toBe(0);
    const [e] = await orders.events(o.id);
    expect(e).toMatchObject({ kind: "refunded", title: "Pago reintegrado", auto: false, toStatus: "reembolsado" });
    expect(e?.detail).toMatch(/por Mercado Pago · prendas al stock · "arrepentimiento"/);
    expect(events[0]?.payload).toMatchObject({ number: o.number, cents: 45_000_00, pending: false });
  });

  it("sin tildar el stock, las prendas no vuelven (ya las tiene el cliente)", async () => {
    const o = await paid();
    await service().refund(o.number, { restock: false, reason: "" });
    expect(stock()).toBe(2);
    expect(orders.unitsSold.get("maddie")).toBe(1);
  });

  it("si Mercado Pago no puede, el pedido queda como estaba y se explica por qué", async () => {
    const o = await paid();
    gateway.refund = async () => {
      throw new RefundRejected("Revisá que la cuenta tenga saldo disponible");
    };
    await expect(service().refund(o.number, { restock: true, reason: "" })).rejects.toThrow(/saldo disponible/);
    expect(orders.items[0]?.status).toBe("nuevo");
    expect(stock()).toBe(2);
    expect(refunded).toEqual([]);
    expect(events).toEqual([]);
  });

  it("una venta del taller cobrada en efectivo se devuelve en mano: no pasa por Mercado Pago", async () => {
    const r = await orders.createReserving(order({ shippingMethod: "taller", channel: "taller" }));
    if (!r.ok) throw new Error("sin stock");
    await orders.markPaid(r.id, { method: "efectivo", installments: 1, at: new Date() });
    const res = await service().refund(`MG-${r.number}`, { restock: true, reason: "" });
    expect(res).toEqual({ cents: 45_000_00, giftcardCents: 0, pending: false });
    expect(calls).toEqual([]);
    expect(orders.items[0]?.status).toBe("reembolsado");
    expect((await orders.events(r.id))[0]?.detail).toMatch(/en efectivo · prendas al stock/);
    expect(events[0]?.payload).toMatchObject({ cents: 45_000_00, cash: true });
  });

  it("no se reintegra dos veces", async () => {
    const o = await paid();
    await service().refund(o.number, { restock: true, reason: "" });
    await expect(service().refund(o.number, { restock: true, reason: "" })).rejects.toThrow(/ya se reintegró/);
    expect(calls).toHaveLength(1);
    expect(stock()).toBe(3);
  });

  it("lo pagado con gift card vuelve a su saldo; si se pagó todo con ella, no se llama a Mercado Pago", async () => {
    const o = await paid({ giftcardId: "g1", giftcardCents: 45_000_00, totalCents: 0 }, false);
    giftcards.redeemed.set(o.id, { cents: 45_000_00, restored: false });
    const r = await service().refund(o.number, { restock: true, reason: "" });
    expect(r).toEqual({ cents: 0, giftcardCents: 45_000_00, pending: false });
    expect(calls).toEqual([]);
    expect(giftcards.redeemed.get(o.id)?.restored).toBe(true);
    expect((await orders.events(o.id))[0]?.detail).toMatch(/a la gift card/);
  });

  it("la compra de una gift card se reintegra solo si nadie la usó, y se anula", async () => {
    const o = await paid({ kind: "giftcard", items: [] });
    giftcards.purchased.set(o.id, { amountCents: 45_000_00, balanceCents: 45_000_00, status: "activa" });
    await service().refund(o.number, { restock: true, reason: "" });
    expect(giftcards.purchased.get(o.id)?.status).toBe("anulada");

    const used = await paid({ kind: "giftcard", items: [] });
    giftcards.purchased.set(used.id, { amountCents: 45_000_00, balanceCents: 10_000_00, status: "activa" });
    await expect(service().refund(used.number, { restock: false, reason: "" })).rejects.toThrow(/ya se usó/);
  });

  it("si falla la devolución de una gift card comprada, vuelve a valer", async () => {
    const o = await paid({ kind: "giftcard", items: [] });
    giftcards.purchased.set(o.id, { amountCents: 45_000_00, balanceCents: 45_000_00, status: "activa" });
    gateway.refund = async () => {
      throw new Error("red");
    };
    await expect(service().refund(o.number, { restock: false, reason: "" })).rejects.toThrow(ConflictError);
    expect(giftcards.purchased.get(o.id)?.status).toBe("activa");
  });

  it("un pago que llegó sin stock (pedido cancelado) devuelve la plata sin tocar el stock", async () => {
    const r = await orders.createReserving(order());
    if (!r.ok) throw new Error();
    await orders.cancelReleasing(r.id);
    orders.payments.set(r.id, {
      provider: "simulado",
      reference: "sim-9",
      status: "approved",
      paidByCustomerCents: null,
      netCents: null,
    });
    await service().refund(`MG-${r.number}`, { restock: true, reason: "" });
    expect(calls[0]?.paymentId).toBe("sim-9");
    expect(orders.items[0]?.status).toBe("reembolsado");
    expect(stock()).toBe(3);
  });

  it("sin pago no hay nada que reintegrar; sin el registro del pago, se avisa", async () => {
    const r = await orders.createReserving(order());
    if (!r.ok) throw new Error();
    await expect(service().refund(`MG-${r.number}`, { restock: true, reason: "" })).rejects.toThrow(/no tiene un pago/);
    const o = await paid({}, false);
    await expect(service().refund(o.number, { restock: true, reason: "" })).rejects.toThrow(/No está el pago/);
  });
});
