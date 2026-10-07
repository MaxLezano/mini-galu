import type { ProductSummary, Size } from "@mini-galu/contracts";

/** Helpers de presentación sobre el DTO de producto (la lógica de negocio vive en api/catalog/domain). */
export const totalStock = (p: Pick<ProductSummary, "variants">) => p.variants.reduce((a, v) => a + v.stock, 0);
export const sizesIn = (p: Pick<ProductSummary, "variants">) =>
  p.variants.filter((v) => v.stock > 0).map((v) => v.size);
export const stockOf = (p: Pick<ProductSummary, "variants">, s: Size) =>
  p.variants.find((v) => v.size === s)?.stock ?? 0;
export const cover = (p: Pick<ProductSummary, "images">, n = 1) =>
  p.images[Math.min(n, p.images.length) - 1]?.url ?? "";

/** "Vestido Samanta Plumeti" → ["Vestido Samanta ", "Plumeti"] para poner la última palabra en itálica. */
export function splitLastWord(name: string): [string, string] {
  const i = name.lastIndexOf(" ");
  return i < 0 ? ["", name] : [name.slice(0, i + 1), name.slice(i + 1)];
}

/** "para *crecer*" → partes con flag de énfasis (títulos editables desde el panel). */
export function emphasis(text: string): { text: string; em: boolean }[] {
  return text
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((t) => (t.startsWith("*") ? { text: t.slice(1, -1), em: true } : { text: t, em: false }));
}

export const stripAccents = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
