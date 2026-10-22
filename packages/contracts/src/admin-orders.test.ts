import { describe, expect, it } from "vitest";
import { type ReturnBase, returnAmounts } from "./admin-orders";

const base = (over: Partial<ReturnBase> = {}): ReturnBase => ({
  itemsCents: 80_000_00,
  discountCents: 0,
  totalCents: 85_000_00,
  giftcardCents: 0,
  refundedCents: 0,
  giftcardRefundedCents: 0,
  ...over,
});

describe("cuánto se devuelve por algunas prendas", () => {
  it("sin cupón ni gift card, el precio de las prendas por Mercado Pago", () => {
    expect(returnAmounts(base(), 30_000_00)).toEqual({
      saleCents: 30_000_00,
      discountCents: 0,
      cents: 30_000_00,
      giftcardCents: 0,
    });
  });

  it("descuenta la parte del cupón que les tocó", () => {
    // cupón de $8.000 sobre $80.000: a una prenda de $30.000 le tocan $3.000
    const r = returnAmounts(base({ discountCents: 8_000_00, totalCents: 77_000_00 }), 30_000_00);
    expect(r).toMatchObject({ saleCents: 27_000_00, discountCents: 3_000_00, cents: 27_000_00 });
  });

  it("reparte entre la gift card y Mercado Pago en la proporción en que se pagó", () => {
    // se pagaron $85.000: $25.000 con gift card y $60.000 por Mercado Pago
    const r = returnAmounts(base({ totalCents: 60_000_00, giftcardCents: 25_000_00 }), 34_000_00);
    expect(r).toEqual({ saleCents: 34_000_00, discountCents: 0, cents: 24_000_00, giftcardCents: 10_000_00 });
  });

  it("nunca devuelve más de lo que queda de cada medio", () => {
    const b = base({ totalCents: 10_000_00, giftcardCents: 75_000_00, refundedCents: 8_000_00 });
    const r = returnAmounts(b, 30_000_00);
    expect(r.cents).toBeLessThanOrEqual(2_000_00);
    expect(r.cents + r.giftcardCents).toBe(30_000_00);
    expect(returnAmounts(base({ refundedCents: 84_000_00 }), 30_000_00)).toMatchObject({
      saleCents: 1_000_00,
      discountCents: 29_000_00,
      cents: 1_000_00,
    });
  });
});
