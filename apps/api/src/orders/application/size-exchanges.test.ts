import { ExchangeInputSchema } from "@mini-galu/contracts";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryVariants, variant } from "../../cart/testing/in-memory";
import { ConflictError } from "../../shared/domain/errors";
import { type DomainEvent, EventBus } from "../../shared/events/event-bus";
import { MemoryOrders } from "../testing/in-memory";
import type { NewOrder } from "./ports";
import { SizeExchanges } from "./size-exchanges";

let variants: MemoryVariants;
let orders: MemoryOrders;
let exchanges: SizeExchanges;
let published: DomainEvent[];
const stock = (size: string) => variants.list.find((v) => v.size === size)?.stock;

const order = (qty: number): NewOrder => ({
  cartId: null,
  userId: null,
  accessToken: "t",
  email: "lucia@gmail.com",
  firstName: "Lucía",
  lastName: "Fernández",
  phone: "+5491155551234",
  whatsappOptIn: true,
  shippingMethod: "taller",
  shippingAddress: null,
  shippingBranch: null,
  postalCode: null,
  province: null,
  pickupSlot: null,
  subtotalCents: 1000 * qty,
  discountCents: 0,
  shippingCents: 0,
  totalCents: 1000 * qty,
  couponId: null,
  couponCode: null,
  reservedUntil: new Date(),
  items: [
    {
      variantId: "maddie-4",
      productSlug: "maddie",
      name: "Maddie",
      colorName: "Crudo",
      size: "4",
      imagePath: null,
      unitPriceCents: 1000,
      qty,
    },
  ],
});

const placePaid = async (qty = 1) => {
  const r = await orders.createReserving(order(qty));
  if (!r.ok) throw new Error("sin stock");
  await orders.markPaid(r.id, { method: "credito", installments: 1, at: new Date() });
  return { ...r, number: `MG-${r.number}` };
};
const input = (x: object) => ExchangeInputSchema.parse(x);

beforeEach(() => {
  variants = new MemoryVariants([variant("maddie", "4", 5), variant("maddie", "6", 1), variant("maddie", "8", 0)]);
  orders = new MemoryOrders(variants);
  const bus = new EventBus();
  published = [];
  bus.on("OrderSizeExchanged", (e) => void published.push(e));
  exchanges = new SizeExchanges(orders, bus);
});

describe("cambio de talle", () => {
  it("ofrece los otros talles del modelo con su stock", async () => {
    const a = await placePaid();
    const o = await orders.findById(a.id);
    if (!o) throw new Error();
    expect(await exchanges.options(o)).toEqual({
      restockSuggested: true,
      items: [
        {
          itemId: o.items[0]?.id,
          sizes: [
            { size: "6", stock: 1 },
            { size: "8", stock: 0 },
          ],
        },
      ],
    });
  });

  it("sin pagar no se ofrece", async () => {
    const r = await orders.createReserving(order(1));
    const o = r.ok ? await orders.findById(r.id) : null;
    if (!o) throw new Error();
    expect(await exchanges.options(o)).toBeNull();
  });

  it("cambia el talle: sale el nuevo del stock, vuelve el devuelto, historial y aviso al cliente", async () => {
    const a = await placePaid();
    expect(stock("4")).toBe(4);
    const itemId = (await orders.findById(a.id))?.items[0]?.id;
    await exchanges.exchange(a.number, input({ itemId, size: "6", reason: "le quedó chico" }));
    expect((await orders.findById(a.id))?.items.map((i) => [i.size, i.qty, i.variantId])).toEqual([
      ["6", 1, "maddie-6"],
    ]);
    expect([stock("4"), stock("6")]).toEqual([5, 0]);
    expect((await orders.events(a.id))[0]).toMatchObject({
      kind: "exchange",
      title: "Cambio de talle",
      detail: 'Maddie · talle 4 → 6 · talle 4 al stock · "le quedó chico"',
      auto: false,
    });
    expect(published[0]?.payload).toMatchObject({ number: a.number, from: "4", to: "6", qty: 1, shipped: false });
  });

  it("una de dos unidades: el renglón se separa; sin devolver al stock si todavía no llegó", async () => {
    const a = await placePaid(2);
    const itemId = (await orders.findById(a.id))?.items[0]?.id;
    await exchanges.exchange(a.number, input({ itemId, size: "6", qty: 1, restock: false }));
    expect((await orders.findById(a.id))?.items.map((i) => [i.size, i.qty])).toEqual([
      ["4", 1],
      ["6", 1],
    ]);
    expect([stock("4"), stock("6")]).toEqual([3, 0]);
  });

  it("sin stock del talle nuevo, o un pedido sin pagar, no se cambia", async () => {
    const a = await placePaid();
    const itemId = (await orders.findById(a.id))?.items[0]?.id;
    await expect(exchanges.exchange(a.number, input({ itemId, size: "8" }))).rejects.toThrow("No queda talle 8");
    const r = await orders.createReserving(order(1));
    const unpaid = r.ok ? await orders.findById(r.id) : null;
    await expect(
      exchanges.exchange(`MG-${unpaid?.number}`, input({ itemId: unpaid?.items[0]?.id, size: "6" })),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(stock("6")).toBe(1);
  });
});
