import { formatARS } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { refundDetail, refundPlan, remainingLines, returnPlan, returnQuote } from "./refund";

const o = {
  status: "preparando" as const,
  kind: "prendas" as const,
  paidAt: new Date(),
  totalCents: 500,
  giftcardCents: 0,
  refundedCents: 0,
  giftcardRefundedCents: 0,
  paymentMethod: "credito" as const,
};

describe("qué se reintegra", () => {
  it("pagado y en el taller: el total y se sugiere devolver las prendas al stock", () => {
    expect(refundPlan(o, true)).toEqual({
      cents: 500,
      cash: false,
      giftcardCents: 0,
      restock: true,
      restockSuggested: true,
      blocked: null,
    });
    expect(refundPlan({ ...o, status: "entregado" }, true)?.restockSuggested).toBe(false);
  });

  it("lo pagado con gift card vuelve a su saldo; sin plata de Mercado Pago no hace falta el pago", () => {
    expect(refundPlan({ ...o, totalCents: 0, giftcardCents: 900 }, false)).toMatchObject({
      cents: 0,
      giftcardCents: 900,
      blocked: null,
    });
  });

  it("sin el pago registrado no hay a qué operación devolverle", () => {
    expect(refundPlan(o, false)?.blocked).toMatch(/desde la cuenta de Mercado Pago/);
  });

  it("venta del taller cobrada en efectivo: se devuelve en mano, sin pago de Mercado Pago", () => {
    expect(refundPlan({ ...o, status: "entregado", paymentMethod: "efectivo" }, false)).toMatchObject({
      cents: 500,
      cash: true,
      blocked: null,
    });
  });

  it("la compra de una gift card no tiene prendas para el stock", () => {
    expect(refundPlan({ ...o, kind: "giftcard", status: "entregado" }, true)).toMatchObject({ restock: false });
  });

  it("un pago que llegó sin stock (cancelado sin pagar) devuelve solo la plata", () => {
    expect(refundPlan({ ...o, status: "cancelado", paidAt: null }, true)).toMatchObject({ cents: 500, restock: false });
  });

  it("nada que reintegrar: sin pagar, cancelado sin pago o ya reembolsado", () => {
    expect(refundPlan({ ...o, status: "esperando_pago", paidAt: null }, false)).toBeNull();
    expect(refundPlan({ ...o, status: "cancelado", paidAt: null }, false)).toBeNull();
    expect(refundPlan({ ...o, status: "reembolsado" }, true)).toBeNull();
  });

  it("arma la línea del historial", () => {
    expect(
      refundDetail(
        { cents: 4_500_000, cash: false, giftcardCents: 500_000, restocked: true, pending: true, reason: "talle" },
        formatARS,
      ),
    ).toBe(
      `${formatARS(4_500_000)} por Mercado Pago (en proceso) · ${formatARS(500_000)} a la gift card · prendas al stock · "talle"`,
    );
    expect(
      refundDetail(
        { cents: 900, cash: true, giftcardCents: 0, restocked: false, pending: false, reason: "" },
        formatARS,
      ),
    ).toBe(`${formatARS(900)} en efectivo`);
  });
});

/** Pedido de $85.000: Maddie x2 a $30.000, Lola a $20.000, envío $5.000. */
const p = {
  ...o,
  status: "entregado" as const,
  totalCents: 85_000_00,
  discountCents: 0,
  shippingCents: 5_000_00,
  items: [
    { id: "a", name: "Maddie", size: "4", qty: 2, returnedQty: 0, unitPriceCents: 30_000_00 },
    { id: "b", name: "Lola", size: "6", qty: 1, returnedQty: 0, unitPriceCents: 20_000_00 },
  ],
};

describe("devolver algunas prendas", () => {
  it("solo de un pedido de prendas pagado al que le quede algo sin devolver", () => {
    expect(returnPlan(p, true)).toMatchObject({ itemsCents: 80_000_00, cash: false, blocked: null });
    expect(returnPlan({ ...p, status: "esperando_pago" }, true)).toBeNull();
    expect(returnPlan({ ...p, kind: "giftcard" }, true)).toBeNull();
    expect(returnPlan({ ...p, items: p.items.map((i) => ({ ...i, returnedQty: i.qty })) }, true)).toBeNull();
    expect(returnPlan(p, false)?.blocked).toMatch(/No está el pago/);
  });

  it("cotiza las prendas y arma los renglones de la nota de crédito", () => {
    const q = returnQuote(p, [{ itemId: "a", qty: 1 }]);
    expect(q).toMatchObject({ cents: 30_000_00, giftcardCents: 0, saleCents: 30_000_00 });
    if ("error" in q) throw new Error(q.error);
    expect(q.lines).toEqual([{ description: "Maddie · talle 4", qty: 1, unitCents: 30_000_00, totalCents: 30_000_00 }]);
  });

  it("no deja devolver más de lo que queda de cada prenda", () => {
    const back = { ...p, items: [{ ...p.items[0], returnedQty: 1 }, p.items[1]] } as typeof p;
    expect(returnQuote(back, [{ itemId: "a", qty: 2 }])).toEqual({
      error: "Del Maddie talle 4 quedan 1 para devolver",
    });
    expect(returnQuote(back, [{ itemId: "z", qty: 1 }])).toMatchObject({ error: /ya no está/ });
    expect(returnQuote(back, [])).toEqual({ error: "Elegí qué prendas devuelve" });
  });

  it("después de devolver una, el reintegro total es lo que queda y la nota lleva lo que quedaba", () => {
    const after = {
      ...p,
      refundedCents: 30_000_00,
      items: [{ ...p.items[0], returnedQty: 1 }, p.items[1]],
    } as typeof p;
    expect(refundPlan(after, true)).toMatchObject({ cents: 55_000_00 });
    const lines = remainingLines(after, 55_000_00);
    expect(lines.map((l) => l.description)).toEqual(["Maddie · talle 4", "Lola · talle 6", "Envío"]);
    expect(lines.reduce((a, l) => a + l.totalCents, 0)).toBe(55_000_00);
  });

  it("la línea del historial nombra las prendas devueltas", () => {
    expect(
      refundDetail(
        {
          cents: 900,
          cash: false,
          giftcardCents: 0,
          restocked: true,
          pending: false,
          reason: "",
          items: [{ name: "Maddie", size: "4", qty: 2 }],
        },
        formatARS,
      ),
    ).toBe(`Maddie talle 4 (2) · ${formatARS(900)} por Mercado Pago · prendas al stock`);
  });
});
