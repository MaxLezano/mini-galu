import { describe, expect, it } from "vitest";
import { EMPTY_CONTACT, EMPTY_SHIPPING } from "../../checkout/checkout-form";
import { addLine, type LinkLine, linesSubtotal, linkError, toLinkInput } from "./payment-link-form";

const elsa: LinkLine = { slug: "elsa", name: "Vestido Elsa", size: "4", qty: 1, priceCents: 36_900_00, imageUrl: "" };

describe("formulario de link de pago", () => {
  it("suma unidades del mismo talle sin pasarse del stock", () => {
    let lines = addLine([], elsa, 2);
    lines = addLine(lines, elsa, 2);
    lines = addLine(lines, elsa, 2);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.qty).toBe(2);
    lines = addLine(lines, { ...elsa, size: "6" }, 5);
    expect(lines).toHaveLength(2);
    expect(linesSubtotal(lines)).toBe(3 * 36_900_00);
  });

  it("pide prendas, datos del cliente y la entrega, en ese orden", () => {
    expect(linkError([], EMPTY_CONTACT, EMPTY_SHIPPING)?.field).toBe("product");
    expect(linkError([elsa], EMPTY_CONTACT, EMPTY_SHIPPING)?.field).toBe("email");
    const contact = {
      ...EMPTY_CONTACT,
      email: "paula@gmail.com",
      firstName: "Paula",
      lastName: "B",
      phone: "11 5555-1234",
    };
    expect(linkError([elsa], contact, { ...EMPTY_SHIPPING, method: "taller" })?.field).toBe("pickupSlot");
    const shipping = { ...EMPTY_SHIPPING, method: "taller" as const, pickupSlot: "x" };
    expect(linkError([elsa], contact, shipping)).toBeNull();
    expect(toLinkInput("instagram", [elsa], contact, shipping)).toMatchObject({
      channel: "instagram",
      shipping: { method: "taller", pickupSlot: "x" },
      items: [{ slug: "elsa", size: "4", qty: 1 }],
    });
  });
});
