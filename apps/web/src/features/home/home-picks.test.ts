import type { ProductSummary } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { launchAvatars, pickChatDemo } from "./home-picks";

const product = (slug: string, over: Partial<ProductSummary> = {}): ProductSummary => ({
  slug,
  name: `Vestido ${slug}`,
  description: "",
  collection: { slug: "otono", name: "Otoño" },
  color: { name: "Rojo", hex: "#A3302B" },
  fabric: "Lino",
  occasions: ["diario"],
  priceCents: 30_000_00,
  compareAtCents: null,
  tag: null,
  isAccessory: false,
  status: "published",
  images: [{ url: `/media/${slug}.webp`, alt: "" }],
  variants: [{ size: "4", stock: 2, measures: null }],
  unitsSold: 0,
  rating: { average: 0, count: 0 },
  createdAt: "2026-10-01T00:00:00.000Z",
  ...over,
});

describe("pickChatDemo", () => {
  it("recomienda una prenda real con stock para la ocasión y el talle de la charla", () => {
    const pick = pickChatDemo([
      product("lila", { occasions: ["cumple"], variants: [{ size: "6", stock: 1, measures: null }] }),
      product("blanco", { occasions: ["bautismo"], variants: [{ size: "2", stock: 0, measures: null }] }),
      product("perla", { occasions: ["bautismo"], variants: [{ size: "4", stock: 3, measures: null }] }),
      product("vincha", { occasions: ["bautismo"], isAccessory: true }),
    ]);
    expect(pick).toMatchObject({ occasion: "bautismo", size: "4", stock: 3 });
    expect(pick?.main.slug).toBe("perla");
    expect(pick?.other.slug).toBe("lila");
  });

  it("sin dos prendas con stock no hay charla", () => {
    expect(pickChatDemo([])).toBeNull();
    expect(pickChatDemo([product("solo", { occasions: ["cumple"] })])).toBeNull();
  });
});

describe("launchAvatars", () => {
  it("usa las prendas de la colección que se lanza o, si no hay, las de la portada", () => {
    const products = [product("a"), product("b", { collection: { slug: "verano", name: "Verano" } })];
    expect(launchAvatars(products, products, "verano")).toEqual(["/media/b.webp"]);
    expect(launchAvatars(products, [products[0] as ProductSummary], "nada")).toEqual(["/media/a.webp"]);
    expect(launchAvatars([], [], null)).toEqual([]);
  });
});
