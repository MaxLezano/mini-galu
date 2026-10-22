import { describe, expect, it } from "vitest";
import { cancelledBy, computeTotals, EXPIRED_REASON, SHOP_CANCEL_REASON } from "./order";

describe("totales del pedido", () => {
  it("cupón, envío gratis y gift card (que paga lo que queda, hasta su saldo)", () => {
    expect(computeTotals({ subtotalCents: 1000, shippingCents: 300, discountCents: 100, freeShipping: false })).toEqual(
      { subtotalCents: 1000, discountCents: 100, shippingCents: 300, giftcardCents: 0, totalCents: 1200 },
    );
    expect(
      computeTotals({
        subtotalCents: 1000,
        shippingCents: 300,
        discountCents: 0,
        freeShipping: true,
        giftcardBalanceCents: 400,
      }),
    ).toMatchObject({ shippingCents: 0, giftcardCents: 400, totalCents: 600 });
    // la gift card cubre todo: no queda nada para pagar (y el saldo que sobra queda en la tarjeta)
    expect(
      computeTotals({
        subtotalCents: 1000,
        shippingCents: 0,
        discountCents: 0,
        freeShipping: false,
        giftcardBalanceCents: 5000,
      }),
    ).toMatchObject({ giftcardCents: 1000, totalCents: 0 });
    expect(
      computeTotals({ subtotalCents: 500, shippingCents: 0, discountCents: 900, freeShipping: false }).totalCents,
    ).toBe(0);
  });
});

describe("cancelledBy", () => {
  it("distingue la reserva vencida de lo que anuló el taller", () => {
    expect(cancelledBy({ status: "cancelado", cancelReason: EXPIRED_REASON })).toBe("vencimiento");
    expect(cancelledBy({ status: "cancelado", cancelReason: `${SHOP_CANCEL_REASON}: lo armé mal` })).toBe("taller");
    expect(cancelledBy({ status: "cancelado", cancelReason: SHOP_CANCEL_REASON })).toBe("taller");
    expect(cancelledBy({ status: "esperando_pago", cancelReason: null })).toBeNull();
  });
});
