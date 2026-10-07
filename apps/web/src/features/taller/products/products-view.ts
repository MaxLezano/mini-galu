import type { AdminProduct } from "@mini-galu/contracts";
import { stripAccents } from "@/lib/product";

/** Filtros y orden del listado de productos del panel (mockup admin-productos.html). */
export type ProductFilter = "all" | "pub" | "draft" | "low" | "out";
export type ProductSort = "name" | "stock" | "sold" | "wait";

export const FILTERS: [ProductFilter, string][] = [
  ["all", "Todos"],
  ["pub", "Publicados"],
  ["draft", "Borradores"],
  ["low", "Stock bajo"],
  ["out", "Con talles agotados"],
];

const total = (p: AdminProduct) => p.variants.reduce((a, v) => a + v.stock, 0);
export const totalWaiting = (p: AdminProduct) => p.waitlist.reduce((a, w) => a + w.count, 0);

export function stockLevel(p: AdminProduct): "draft" | "out" | "low" | "ok" {
  const t = total(p);
  if (p.status === "draft") return "draft";
  if (t === 0) return "out";
  return t <= 3 || p.variants.some((v) => v.stock === 1) ? "low" : "ok";
}

const MATCH: Record<ProductFilter, (p: AdminProduct) => boolean> = {
  all: () => true,
  pub: (p) => p.status === "published",
  draft: (p) => p.status === "draft",
  low: (p) => stockLevel(p) === "low",
  out: (p) => p.status === "published" && p.variants.some((v) => v.stock === 0),
};

const SORT: Record<ProductSort, (a: AdminProduct, b: AdminProduct) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, "es"),
  stock: (a, b) => total(a) - total(b),
  sold: (a, b) => b.unitsSold - a.unitsSold,
  wait: (a, b) => totalWaiting(b) - totalWaiting(a),
};

export function filterCounts(list: AdminProduct[]): Record<ProductFilter, number> {
  return Object.fromEntries(FILTERS.map(([k]) => [k, list.filter(MATCH[k]).length])) as Record<ProductFilter, number>;
}

export function viewProducts(list: AdminProduct[], f: ProductFilter, q: string, sort: ProductSort): AdminProduct[] {
  const term = stripAccents(q.trim());
  return list.filter((p) => MATCH[f](p) && (!term || stripAccents(p.name).includes(term))).sort(SORT[sort]);
}

export function kpis(list: AdminProduct[]) {
  const pub = list.filter((p) => p.status === "published");
  const best = [...pub].sort((a, b) => b.unitsSold - a.unitsSold)[0];
  return {
    published: pub.length,
    drafts: list.length - pub.length,
    units: pub.reduce((a, p) => a + total(p), 0),
    soldOut: pub.reduce((a, p) => a + p.variants.filter((v) => v.stock === 0).length, 0),
    waiting: list.reduce((a, p) => a + totalWaiting(p), 0),
    sold: pub.reduce((a, p) => a + p.unitsSold, 0),
    best: best?.unitsSold ? best.name : null,
  };
}
