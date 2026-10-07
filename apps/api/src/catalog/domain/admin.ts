import type { Size } from "@mini-galu/contracts";
import { normalize } from "../../shared/domain/text";
import type { Variant } from "./product";

/** "Vestido Samanta Plumeti" → "vestido-samanta-plumeti" */
export function slugify(name: string): string {
  return (
    normalize(name)
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "prenda"
  );
}

/** Si el slug ya existe agrega -2, -3… (los slugs no cambian después: son la URL de la prenda). */
export function uniqueSlug(base: string, taken: ReadonlySet<string>): string {
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Talles que estaban agotados (o no existían) y ahora tienen stock: disparan "Volvió un talle". */
export function replenishedSizes(
  before: readonly Variant[],
  after: readonly Pick<Variant, "size" | "stock">[],
): Size[] {
  return after
    .filter((v) => v.stock > 0 && (before.find((b) => b.size === v.size)?.stock ?? 0) === 0)
    .map((v) => v.size);
}
