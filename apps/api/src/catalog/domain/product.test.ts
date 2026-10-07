import { CatalogQuerySchema } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { makeProduct } from "../testing/fixtures";
import {
  availableSizes,
  completeTheLook,
  filterProducts,
  fitJustoPercent,
  parseSearch,
  ratingDistribution,
  totalStock,
} from "./product";

const samanta = makeProduct({
  slug: "samanta",
  name: "Vestido Samanta Plumeti",
  fabric: "Plumeti de algodón",
  occasions: ["fiesta", "bautismo"],
  collection: { slug: "fiestas", name: "Fiestas" },
  priceCents: 47_000_00,
  variants: [
    { size: "6", stock: 0, measures: null },
    { size: "8", stock: 3, measures: null },
  ],
});
const cleo = makeProduct({
  slug: "cleo",
  name: "Vestido Cleo",
  color: { name: "Crema", hex: "#EFE6D6" },
  occasions: ["diario"],
  priceCents: 26_900_00,
  unitsSold: 20,
  variants: [{ size: "6", stock: 2, measures: null }],
});
const moño = makeProduct({
  slug: "mono-verde",
  name: "Moño Verde",
  isAccessory: true,
  occasions: ["regalo"],
  priceCents: 2_500_00,
});
const agotado = makeProduct({ slug: "agotado", variants: [{ size: "4", stock: 0, measures: null }] });
const all = [samanta, cleo, moño, agotado];
const q = (input: Record<string, string>) => CatalogQuerySchema.parse(input);

describe("stock", () => {
  it("suma stock y lista talles disponibles", () => {
    expect(totalStock(samanta)).toBe(3);
    expect(availableSizes(samanta)).toEqual(["8"]);
  });
});

describe("parseSearch", () => {
  it("separa el talle de las palabras y saca plurales y tildes", () => {
    expect(parseSearch("Vestidos rojos talle 6")).toEqual({ words: ["vestido", "rojo"], size: "6" });
    expect(parseSearch("bautismo talle 12 m")).toEqual({ words: ["bautismo"], size: "12m" });
    expect(parseSearch("comunión")).toEqual({ words: ["comunion"], size: null });
  });
});

describe("filterProducts", () => {
  it("por defecto oculta lo agotado", () => {
    expect(filterProducts(all, q({})).map((p) => p.slug)).not.toContain("agotado");
    expect(filterProducts(all, q({ instock: "0" })).map((p) => p.slug)).toContain("agotado");
  });

  it("el filtro de talle solo muestra talles con stock", () => {
    expect(filterProducts(all, q({ talle: "6" })).map((p) => p.slug)).toEqual(["cleo"]);
  });

  it("filtra por colección, ocasión, color y precio", () => {
    expect(filterProducts(all, q({ col: "fiestas" })).map((p) => p.slug)).toEqual(["samanta"]);
    expect(filterProducts(all, q({ ocasion: "bautismo" })).map((p) => p.slug)).toEqual(["samanta"]);
    expect(filterProducts(all, q({ color: "Crema" })).map((p) => p.slug)).toEqual(["cleo"]);
    expect(
      filterProducts(all, q({ max: String(30_000_00) }))
        .map((p) => p.slug)
        .sort(),
    ).toEqual(["cleo", "mono-verde"]);
  });

  it("busca en tela y ocasiones, respetando el talle de la búsqueda", () => {
    expect(filterProducts(all, q({ q: "plumeti" })).map((p) => p.slug)).toEqual(["samanta"]);
    expect(filterProducts(all, q({ q: "plumeti talle 6" }))).toEqual([]);
  });

  it("ordena por precio y por más vendidos", () => {
    expect(filterProducts(all, q({ sort: "asc" }))[0]?.slug).toBe("mono-verde");
    expect(filterProducts(all, q({ sort: "pop" }))[0]?.slug).toBe("cleo");
  });
});

describe("completeTheLook", () => {
  it("pone los accesorios primero", () => {
    expect(completeTheLook(samanta, all).map((p) => p.slug)[0]).toBe("mono-verde");
  });
});

describe("reseñas", () => {
  it("arma la distribución de estrellas y el % de talle justo", () => {
    expect(ratingDistribution([{ rating: 5 }, { rating: 5 }, { rating: 4 }])).toEqual([2, 1, 0, 0, 0]);
    expect(fitJustoPercent([{ fit: "justo" }, { fit: "grande" }, { fit: null }])).toBe(50);
    expect(fitJustoPercent([])).toBeNull();
  });
});
