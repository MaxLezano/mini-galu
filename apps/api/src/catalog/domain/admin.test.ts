import { describe, expect, it } from "vitest";
import { replenishedSizes, slugify, uniqueSlug } from "./admin";

describe("slugify", () => {
  it("saca tildes, signos y espacios", () => {
    expect(slugify("Vestido Samanta Plumeti")).toBe("vestido-samanta-plumeti");
    expect(slugify("  Moño Verde (largo)! ")).toBe("mono-verde-largo");
    expect(slugify("¡¡!!")).toBe("prenda");
  });
});

describe("uniqueSlug", () => {
  it("agrega un número si ya existe", () => {
    expect(uniqueSlug("cleo", new Set())).toBe("cleo");
    expect(uniqueSlug("cleo", new Set(["cleo", "cleo-2"]))).toBe("cleo-3");
  });
});

describe("replenishedSizes", () => {
  it("detecta solo los talles que pasan de 0 a tener stock", () => {
    const before = [
      { size: "4", stock: 0, measures: null },
      { size: "6", stock: 2, measures: null },
      { size: "8", stock: 0, measures: null },
    ] as const;
    const after = [
      { size: "4", stock: 3 },
      { size: "6", stock: 5 },
      { size: "8", stock: 0 },
      { size: "10", stock: 1 },
    ] as const;
    expect(replenishedSizes([...before], [...after])).toEqual(["4", "10"]);
  });
});
