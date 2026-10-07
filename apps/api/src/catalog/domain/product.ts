import type { CatalogQuery, Fit, Measures, Occasion, ProductStatus, Size, Sort } from "@mini-galu/contracts";
import { sizeOrder } from "@mini-galu/contracts";
import { normalize, stem } from "../../shared/domain/text";

/** Modelo de dominio del catálogo. Sin dependencias de framework ni de DB. */
export type Variant = { size: Size; stock: number; measures: Measures | null };
export type ProductImage = { path: string; alt: string };
export type ReviewStats = { average: number; count: number };

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  collection: { slug: string; name: string };
  color: { name: string; hex: string };
  fabric: string;
  care: string;
  occasions: Occasion[];
  priceCents: number;
  compareAtCents: number | null;
  tag: string | null;
  isAccessory: boolean;
  status: ProductStatus;
  images: ProductImage[];
  variants: Variant[];
  unitsSold: number;
  rating: ReviewStats;
  createdAt: Date;
};

export type Review = {
  author: string;
  city: string | null;
  rating: number;
  title: string;
  body: string;
  size: Size | null;
  fit: Fit | null;
  createdAt: Date;
};

export const LOW_STOCK = 2;

export const totalStock = (p: Pick<Product, "variants">) => p.variants.reduce((a, v) => a + v.stock, 0);

export const availableSizes = (p: Pick<Product, "variants">) =>
  p.variants.filter((v) => v.stock > 0).map((v) => v.size);

export const stockFor = (p: Pick<Product, "variants">, size: Size) =>
  p.variants.find((v) => v.size === size)?.stock ?? 0;

export const hasSize = (p: Pick<Product, "variants">, size: Size) => p.variants.some((v) => v.size === size);

export const sortVariants = (vs: Variant[]) => [...vs].sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size));

/** Texto en el que busca el buscador: nombre, descripción, tela, color, ocasiones y colección. */
const haystack = (p: Product) =>
  normalize(`${p.name} ${p.description} ${p.fabric} ${p.color.name} ${p.occasions.join(" ")} ${p.collection.name}`);

const SIZE_IN_QUERY = /talle\s*(12\s*m\b|\d{1,2})/i;

/** "vestido rojo talle 6" → { words: ["vestido","rojo"], size: "6" } */
export function parseSearch(q: string): { words: string[]; size: Size | null } {
  const m = q.match(SIZE_IN_QUERY);
  const size = (m?.[1]?.replace(/\s/g, "") as Size | undefined) ?? null;
  const words = normalize(q.replace(SIZE_IN_QUERY, "")).split(/\s+/).filter(Boolean).map(stem);
  return { words, size };
}

export function matchesSearch(p: Product, q: string): boolean {
  const { words, size } = parseSearch(q);
  const hay = haystack(p);
  return words.every((w) => hay.includes(w)) && (!size || stockFor(p, size) > 0);
}

const SORTERS: Record<Sort, (a: Product, b: Product) => number> = {
  new: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  asc: (a, b) => a.priceCents - b.priceCents,
  desc: (a, b) => b.priceCents - a.priceCents,
  pop: (a, b) => b.unitsSold - a.unitsSold,
};

/** Filtros del catálogo (mockup catalogo.html). */
export function filterProducts(list: Product[], q: CatalogQuery): Product[] {
  return list
    .filter(
      (p) =>
        (!q.col || p.collection.slug === q.col) &&
        (!q.talle.length || q.talle.some((s) => stockFor(p, s) > 0)) &&
        (!q.ocasion.length || p.occasions.some((o) => q.ocasion.includes(o))) &&
        (!q.color.length || q.color.includes(p.color.name)) &&
        (!q.max || p.priceCents <= q.max) &&
        (!q.instock || totalStock(p) > 0) &&
        (!q.q || matchesSearch(p, q.q)),
    )
    .sort(SORTERS[q.sort]);
}

/** "Completá el look": accesorios primero, después prendas que comparten ocasión. */
export function completeTheLook(p: Product, all: Product[], n = 4): Product[] {
  return all
    .filter(
      (x) =>
        x.slug !== p.slug &&
        x.status === "published" &&
        (x.isAccessory || x.occasions.some((o) => p.occasions.includes(o))),
    )
    .sort((a, b) => Number(b.isAccessory) - Number(a.isAccessory))
    .slice(0, n);
}

export function ratingDistribution(reviews: Pick<Review, "rating">[]): number[] {
  const d = [0, 0, 0, 0, 0];
  for (const r of reviews) d[5 - r.rating] = (d[5 - r.rating] ?? 0) + 1;
  return d;
}

export function fitJustoPercent(reviews: Pick<Review, "fit">[]): number | null {
  const withFit = reviews.filter((r) => r.fit);
  if (!withFit.length) return null;
  return Math.round((withFit.filter((r) => r.fit === "justo").length / withFit.length) * 100);
}
