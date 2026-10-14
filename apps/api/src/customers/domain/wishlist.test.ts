import { describe, expect, it } from "vitest";
import { revealGiver, wishSlug } from "./wishlist";

describe("lista de cumple", () => {
  it("link legible y difícil de adivinar", () => {
    expect(wishSlug("Olivia", "7k2q")).toBe("olivia-7k2q");
    expect(wishSlug("María José ♡", "ab12")).toBe("maria-jose-ab12");
    expect(wishSlug("♡", "ab12")).toBe("lista-ab12");
  });

  it("quién regaló se ve recién después del cumple", () => {
    const gifted = new Date(2026, 9, 20); // 20 de octubre
    expect(revealGiver("2021-11-14", gifted, new Date(2026, 10, 13))).toBe(false);
    expect(revealGiver("2021-11-14", gifted, new Date(2026, 10, 14))).toBe(true);
    // regalado después del cumple de este año: se ve en el del año que viene
    expect(revealGiver("2021-03-03", gifted, new Date(2026, 11, 1))).toBe(false);
    expect(revealGiver("2021-03-03", gifted, new Date(2027, 2, 3))).toBe(true);
    expect(revealGiver(null, gifted, new Date(2026, 10, 25))).toBe(true);
  });
});
