import { describe, expect, it } from "vitest";
import { formatMeasures } from "./size-advisor";

describe("formatMeasures", () => {
  it("arma el texto de la tabla", () => {
    expect(formatMeasures({ largo: 50, axila: 30 })).toBe("Largo 50 · axila 30");
    expect(formatMeasures(null)).toBe("—");
  });
});
