import { formatARS } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { refundDetail, refundPlan } from "./refund";

const o = {
  status: "preparando" as const,
  kind: "prendas" as const,
  paidAt: new Date(),
  totalCents: 500,
  giftcardCents: 0,
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
