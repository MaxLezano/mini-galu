import { describe, expect, it } from "vitest";
import { paymentLabel } from "./invoice";

describe("paymentLabel", () => {
  it("nombra el medio y las cuotas", () => {
    expect(paymentLabel({ method: "credito", installments: 3, giftcardCents: 0 })).toBe(
      "Tarjeta de crédito · 3 cuotas",
    );
  });

  it("suma lo pagado con gift card y no repite el medio si la gift card cubrió todo", () => {
    expect(paymentLabel({ method: "credito", installments: 1, giftcardCents: 2_100_00 })).toBe(
      "Gift card $2.100,00 + Tarjeta de crédito",
    );
    expect(paymentLabel({ method: "giftcard", installments: null, giftcardCents: 47_900_00 })).toBe(
      "Gift card $47.900,00",
    );
  });

  it("sin medio ni gift card no hay nada que imprimir", () => {
    expect(paymentLabel({ method: null, installments: null, giftcardCents: 0 })).toBeNull();
  });
});
