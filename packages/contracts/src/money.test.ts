import { describe, expect, it } from "vitest";
import { installmentsLabel } from "./checkout";
import { discountPercent, formatARS, installment } from "./money";

describe("money", () => {
  it("formatea centavos como pesos es-AR", () => {
    expect(formatARS(38_000_00)).toBe("$38.000");
    expect(formatARS(2_500_00)).toBe("$2.500");
    expect(formatARS(1_234_567_00)).toBe("$1.234.567");
    expect(formatARS(0)).toBe("$0");
  });

  it("calcula la cuota sin interés", () => {
    expect(formatARS(installment(39_000_00, 6))).toBe("$6.500");
  });

  it("solo promete cuotas sin interés si Mercado Pago las confirma", () => {
    expect(installmentsLabel({ interestFree: 6, max: 12 }, 39_000_00, formatARS)).toBe(
      "6 cuotas sin interés de $6.500",
    );
    expect(installmentsLabel({ interestFree: 1, max: 12 }, 39_000_00, formatARS)).toBe(
      "Hasta 12 cuotas con Mercado Pago",
    );
    expect(installmentsLabel({ interestFree: 1, max: 1 }, 39_000_00, formatARS)).toBeNull();
  });

  it("calcula el descuento contra el precio anterior", () => {
    expect(discountPercent(26_900_00, 31_900_00)).toBe(16);
    expect(discountPercent(26_900_00, null)).toBeNull();
    expect(discountPercent(26_900_00, 20_000_00)).toBeNull();
  });
});
