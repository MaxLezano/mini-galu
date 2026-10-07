import { describe, expect, it } from "vitest";
import { discountPercent, formatARS, installment, offersInstallments } from "./money";

describe("money", () => {
  it("formatea centavos como pesos es-AR", () => {
    expect(formatARS(38_000_00)).toBe("$38.000");
    expect(formatARS(2_500_00)).toBe("$2.500");
    expect(formatARS(1_234_567_00)).toBe("$1.234.567");
    expect(formatARS(0)).toBe("$0");
  });

  it("calcula la cuota de 6 sin interés", () => {
    expect(formatARS(installment(39_000_00))).toBe("$6.500");
  });

  it("no ofrece cuotas en accesorios baratos", () => {
    expect(offersInstallments(2_500_00)).toBe(false);
    expect(offersInstallments(26_900_00)).toBe(true);
  });

  it("calcula el descuento contra el precio anterior", () => {
    expect(discountPercent(26_900_00, 31_900_00)).toBe(16);
    expect(discountPercent(26_900_00, null)).toBeNull();
    expect(discountPercent(26_900_00, 20_000_00)).toBeNull();
  });
});
