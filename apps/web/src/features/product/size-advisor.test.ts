import { describe, expect, it } from "vitest";
import { formatMeasures, recommendSize } from "./size-advisor";

describe("recommendSize", () => {
  it("usa el mayor entre altura y edad", () => {
    expect(recommendSize(5, 112)).toBe("6");
    expect(recommendSize(4, 125)).toBe("8");
    expect(recommendSize(1, 75)).toBe("12m");
    expect(recommendSize(10, 150)).toBe("10");
  });
});

describe("formatMeasures", () => {
  it("arma el texto de la tabla", () => {
    expect(formatMeasures({ largo: 50, axila: 30 })).toBe("Largo 50 · axila 30");
    expect(formatMeasures(null)).toBe("—");
  });
});
