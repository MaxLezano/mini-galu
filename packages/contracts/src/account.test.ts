import { describe, expect, it } from "vitest";
import { AddressInputSchema, DocumentSchema, FirstNameSchema, PasswordSchema, PhoneSchema } from "./account";

describe("PasswordSchema", () => {
  it("pide 8+ caracteres con mayúscula, minúscula, número y especial", () => {
    expect(PasswordSchema.safeParse("Taller.Galu1").success).toBe(true);
    expect(PasswordSchema.safeParse("Ab1.").success).toBe(false);
    expect(PasswordSchema.safeParse("tallergalu1.").success).toBe(false);
    expect(PasswordSchema.safeParse("TALLERGALU1.").success).toBe(false);
    expect(PasswordSchema.safeParse("Tallergalu.").success).toBe(false);
    expect(PasswordSchema.safeParse("Tallergalu1").success).toBe(false);
  });

  it("dice todo lo que falta en un solo mensaje", () => {
    const r = PasswordSchema.safeParse("taller");
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.message).toBe(
      "La contraseña necesita: al menos 8 caracteres, una mayúscula, un número, un carácter especial (ej. . ! # @)",
    );
  });
});

describe("datos personales", () => {
  it("nombres con tildes, ñ y espacios; sin números", () => {
    expect(FirstNameSchema.safeParse("María José").success).toBe(true);
    expect(FirstNameSchema.safeParse("Ñandú O'Neil").success).toBe(true);
    expect(FirstNameSchema.safeParse("Lucía2").success).toBe(false);
  });

  it("teléfono en formato internacional", () => {
    expect(PhoneSchema.safeParse({ country: "AR", number: "+5491155551234" }).success).toBe(true);
    expect(PhoneSchema.safeParse({ country: "AR", number: "11 5555-1234" }).success).toBe(false);
  });

  it("DNI y CUIT con su largo", () => {
    expect(DocumentSchema.safeParse({ type: "DNI", number: "30123456" }).success).toBe(true);
    expect(DocumentSchema.safeParse({ type: "DNI", number: "30.123.456" }).success).toBe(false);
    expect(DocumentSchema.safeParse({ type: "CUIT", number: "20301234567" }).success).toBe(true);
  });

  it("dirección con CP argentino viejo o CPA nuevo y observaciones", () => {
    const base = { street: "Gurruchaga", number: "1234", city: "CABA", province: "CABA" };
    expect(AddressInputSchema.parse({ ...base, postalCode: "1414" }).country).toBe("AR");
    expect(AddressInputSchema.safeParse({ ...base, postalCode: "C1414ABC", notes: "Portón negro" }).success).toBe(true);
    expect(AddressInputSchema.safeParse({ ...base, postalCode: "14" }).success).toBe(false);
  });
});
