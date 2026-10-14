import { describe, expect, it } from "vitest";
import { deliveryLabel, EMPTY_GIFTCARD, type GiftcardForm, otherAmount, toPurchase } from "./giftcard-form";

const filled: GiftcardForm = {
  ...EMPTY_GIFTCARD,
  toName: "Olivia",
  fromName: "La tía Sole",
  message: "  ¡Feliz cumple!  ",
  recipient: "11 5555-1234",
  buyer: { email: "sole@gmail.com", firstName: "Sole", lastName: "Paz", phone: "11 4444-5555" },
};

describe("armado de la gift card", () => {
  it("el otro monto se escribe con puntos", () => {
    expect(otherAmount("12500")).toEqual({ text: "12.500", amount: 12_500 });
    expect(otherAmount("$ 7.000,")).toEqual({ text: "7.000", amount: 7000 });
    expect(otherAmount("")).toEqual({ text: "", amount: 0 });
  });

  it("cuenta cómo y cuándo llega", () => {
    expect(deliveryLabel(filled, (d) => d)).toBe("Por WhatsApp · se la mandás vos");
    expect(deliveryLabel({ ...filled, via: "mail" }, (d) => d)).toBe("Por mail · ahora mismo");
    expect(deliveryLabel({ ...filled, via: "mail", when: "fecha", day: "2026-10-20" }, () => "20 de octubre")).toBe(
      "Por mail · el 20 de octubre a las 9",
    );
  });

  it("arma la compra o dice qué falta", () => {
    const r = toPurchase(filled);
    expect(r).toMatchObject({
      ok: true,
      value: { amountCents: 20_000_00, message: "¡Feliz cumple!", deliverOn: null },
    });
    expect(toPurchase({ ...filled, amount: 4000 })).toEqual({ ok: false, error: "El monto mínimo es $5.000" });
    expect(toPurchase({ ...filled, via: "mail", recipient: "a@b.com", when: "fecha" })).toEqual({
      ok: false,
      error: "Elegí el día en que le llega",
    });
    expect(toPurchase({ ...filled, when: "fecha", day: "2026-10-20" })).toMatchObject({ value: { deliverOn: null } });
    expect(toPurchase({ ...filled, toName: " " })).toEqual({ ok: false, error: "Poné para quién es" });
    expect(toPurchase({ ...filled, via: "mail" })).toEqual({ ok: false, error: "Revisá el mail de quien la recibe" });
  });
});
