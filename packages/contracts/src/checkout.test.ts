import { describe, expect, it } from "vitest";
import { CheckoutContactSchema, CouponInputSchema, ShippingInputSchema, toE164AR } from "./checkout";

describe("toE164AR", () => {
  it.each([
    ["11 5555-1234", "+5491155551234"],
    ["011 5555 1234", "+5491155551234"],
    ["+54 9 11 5555 1234", "+5491155551234"],
    ["54 351 444 5566", "+5493514445566"],
    ["+598 99 123 456", "+59899123456"],
  ])("%s → %s", (input, out) => expect(toE164AR(input)).toBe(out));

  it("no adivina con el 15 ni con números cortos", () => {
    expect(toE164AR("11 15 5555 1234")).toBeNull();
    expect(toE164AR("5555-1234")).toBeNull();
  });
});

describe("CheckoutContactSchema", () => {
  it("normaliza email y celular", () => {
    const c = CheckoutContactSchema.parse({
      email: " Lucia@Gmail.com ",
      firstName: "Lucía",
      lastName: "Fernández",
      phone: "11 5555-1234",
    });
    expect(c.email).toBe("lucia@gmail.com");
    expect(c.phone).toBe("+5491155551234");
    expect(c.whatsappOptIn).toBe(true);
  });
});

describe("ShippingInputSchema", () => {
  it("a domicilio pide calle, altura y localidad", () => {
    const r = ShippingInputSchema.safeParse({ method: "domicilio", postalCode: "1414", province: "CABA" });
    expect(r.success).toBe(false);
  });
  it("retiro en el taller solo pide la franja", () => {
    expect(ShippingInputSchema.parse({ method: "taller", pickupSlot: "2026-10-08T10" })).toEqual({
      method: "taller",
      pickupSlot: "2026-10-08T10",
    });
  });
});

describe("CouponInputSchema", () => {
  it("pasa el código a mayúsculas sin espacios", () => {
    expect(CouponInputSchema.parse({ code: " prima vera15 ", kind: "percent", value: 15 }).code).toBe("PRIMAVERA15");
  });
  it("valida el porcentaje y el monto fijo", () => {
    expect(CouponInputSchema.safeParse({ code: "MAL", kind: "percent", value: 120 }).success).toBe(false);
    expect(CouponInputSchema.safeParse({ code: "FIJO", kind: "fixed", value: 0 }).success).toBe(false);
    expect(CouponInputSchema.safeParse({ code: "ENVIO", kind: "free_shipping", value: 0 }).success).toBe(true);
  });
});
