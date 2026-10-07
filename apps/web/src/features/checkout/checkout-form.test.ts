import { describe, expect, it } from "vitest";
import {
  contactError,
  EMPTY_CONTACT,
  EMPTY_SHIPPING,
  quotablePostalCode,
  shippingError,
  shippingSummary,
  toShippingInput,
} from "./checkout-form";

describe("checkout-form", () => {
  it("datos: avisa el primer campo que falta", () => {
    expect(contactError(EMPTY_CONTACT)?.field).toBe("email");
    expect(
      contactError({ ...EMPTY_CONTACT, email: "a@b.co", firstName: "Lucía", lastName: "F", phone: "11 15 5555 1234" })
        ?.message,
    ).toContain("sin el 15");
    expect(
      contactError({ ...EMPTY_CONTACT, email: "a@b.co", firstName: "Lucía", lastName: "F", phone: "11 5555 1234" }),
    ).toBeNull();
  });

  it("envío: a domicilio pide la dirección; retiro solo el horario", () => {
    const base = { ...EMPTY_SHIPPING, postalCode: "1414" };
    expect(shippingError(base)?.field).toBe("street");
    expect(shippingError({ ...base, street: "Gurruchaga", number: "1234", city: "CABA" })).toBeNull();
    expect(shippingError({ ...base, method: "taller" })?.message).toContain("retirar");
    expect(toShippingInput({ ...base, method: "sucursal" })).toEqual({
      method: "sucursal",
      postalCode: "1414",
      province: "CABA",
    });
  });

  it("CP cotizable y resumen", () => {
    expect(quotablePostalCode("141")).toBe(false);
    expect(quotablePostalCode("1414")).toBe(true);
    expect(quotablePostalCode("C1414ABC")).toBe(true);
    expect(shippingSummary({ ...EMPTY_SHIPPING, method: "taller" }, "Jue 8 · 10 a 13 h")).toBe(
      "Retiro en el taller · Jue 8 · 10 a 13 h",
    );
  });
});
