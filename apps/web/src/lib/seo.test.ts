import type { ProductDetail } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { absoluteUrl, productJsonLd, serializeJsonLd } from "./seo";
import { SITE } from "./site";

const product: ProductDetail = {
  slug: "mono-verde",
  name: "Mono Verde",
  description: "Mono de lino.",
  collection: { slug: "verano", name: "Verano" },
  color: { name: "Verde", hex: "#5B6B4A" },
  fabric: "Lino",
  occasions: [],
  priceCents: 3_450_050,
  compareAtCents: null,
  tag: null,
  isAccessory: false,
  status: "published",
  images: [{ url: "http://localhost:4000/media/products/mono-verde-1.webp", alt: "Mono Verde" }],
  variants: [
    { size: "4", stock: 0, measures: null },
    { size: "6", stock: 2, measures: null },
  ],
  unitsSold: 0,
  rating: { average: 4.666, count: 3 },
  createdAt: "2026-10-01T00:00:00.000Z",
  care: "",
  reviews: [],
  ratingDistribution: [2, 1, 0, 0, 0],
  fitJustoPercent: null,
  completeTheLook: [],
};

type ProductNode = { offers: Record<string, string>; aggregateRating?: Record<string, unknown>; image: string[] };
const productNode = (p: ProductDetail) => productJsonLd(p)["@graph"][0] as unknown as ProductNode;

describe("datos estructurados del producto", () => {
  it("precio en pesos (de centavos), stock, puntaje y links absolutos", () => {
    const node = productNode(product);
    expect(node.offers).toMatchObject({
      url: `${SITE.url}/producto/mono-verde`,
      priceCurrency: "ARS",
      price: "34500.50",
      availability: "https://schema.org/InStock",
    });
    expect(node.aggregateRating).toMatchObject({ ratingValue: "4.7", reviewCount: 3 });
    expect(node.image).toEqual(["http://localhost:4000/media/products/mono-verde-1.webp"]);
  });

  it("sin stock o en borrador figura agotado; sin reseñas no hay puntaje", () => {
    const sinStock = { ...product, variants: [{ size: "6" as const, stock: 0, measures: null }] };
    expect(productNode(sinStock).offers.availability).toBe("https://schema.org/OutOfStock");
    expect(productNode({ ...product, status: "draft" }).offers.availability).toBe("https://schema.org/OutOfStock");
    expect(productNode({ ...product, rating: { average: 0, count: 0 } }).aggregateRating).toBeUndefined();
  });

  it("migas Inicio / Catálogo / colección / producto", () => {
    const crumbs = productJsonLd(product)["@graph"][1] as { itemListElement: { name: string; position: number }[] };
    expect(crumbs.itemListElement.map((c) => `${c.position}:${c.name}`)).toEqual([
      "1:Inicio",
      "2:Catálogo",
      "3:Verano",
      "4:Mono Verde",
    ]);
  });
});

describe("serializeJsonLd y absoluteUrl", () => {
  it("un texto con </script> no cierra el script", () => {
    expect(serializeJsonLd({ name: "</script><b>" })).toBe('{"name":"\u003c/script>\u003cb>"}');
  });

  it("completa rutas con la dirección de la tienda y respeta las absolutas", () => {
    expect(absoluteUrl("/catalogo")).toBe(`${SITE.url}/catalogo`);
    expect(absoluteUrl("https://cdn.example/x.webp")).toBe("https://cdn.example/x.webp");
  });
});
