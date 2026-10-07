import { ProductInputSchema } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { emptyForm, parsePesos, toInput } from "./product-form";

describe("parsePesos", () => {
  it("entiende como escribe la gente los precios", () => {
    expect(parsePesos("$38.000")).toBe(38_000_00);
    expect(parsePesos("38000")).toBe(38_000_00);
    expect(parsePesos("2.500,50")).toBe(2_500_50);
    expect(parsePesos("")).toBeNull();
    expect(parsePesos("$0")).toBeNull();
  });
});

describe("toInput", () => {
  it("un formulario completo pasa el mismo esquema que usa la API", () => {
    const f = {
      ...emptyForm("verano-2027"),
      name: "Vestido Elsa",
      description: "Lino salvia.",
      colorName: "Salvia",
      fabric: "Lino",
      price: "$28.000",
      variants: [{ size: "4" as const, stock: 2, measures: { largo: 50, axila: 0 } }],
    };
    const input = toInput(f, "draft");
    expect(input.variants[0]?.measures).toEqual({ largo: 50 });
    expect(ProductInputSchema.safeParse(input).success).toBe(true);
    // publicar sin fotos no pasa
    expect(ProductInputSchema.safeParse(toInput(f, "published")).success).toBe(false);
  });
});
