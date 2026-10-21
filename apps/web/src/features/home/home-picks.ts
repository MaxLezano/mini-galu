import { OCCASIONS, type Occasion, type ProductSummary, type Size } from "@mini-galu/contracts";
import { cover, stockOf } from "@/lib/product";

/** Avatares de "personas ya se anotaron": prendas de la colección que se lanza o, si no hay, las de la portada. */
export function launchAvatars(products: ProductSummary[], rail: ProductSummary[], collectionSlug?: string | null) {
  const own = collectionSlug ? products.filter((p) => p.collection.slug === collectionSlug) : [];
  return (own.length ? own : rail)
    .map((p) => cover(p))
    .filter(Boolean)
    .slice(0, 3);
}

export type ChatDemoPick = {
  occasion: string;
  size: Size;
  /** La que recomienda Galú, con stock en ese talle. */
  main: ProductSummary;
  stock: number;
  /** Otra para la misma ocasión (o cualquiera con stock). */
  other: ProductSummary;
};

/** Ocasiones que suenan bien en "busco algo para el … de mi sobrina", en orden de preferencia. */
const DEMO_OCCASIONS: Occasion[] = ["bautismo", "cumple", "casamiento", "comunion", "navidad"];
const DEMO_SIZES: Size[] = ["2", "4", "6", "8", "10"];

/**
 * Charla de ejemplo de la home con el catálogo de ese momento (antes nombraba prendas del seed). Sin dos prendas con
 * stock no hay charla.
 */
export function pickChatDemo(products: ProductSummary[]): ChatDemoPick | null {
  const garments = products.filter((p) => !p.isAccessory && p.status === "published");
  for (const occasion of DEMO_OCCASIONS) {
    for (const size of DEMO_SIZES) {
      const main = garments.find((p) => p.occasions.includes(occasion) && stockOf(p, size) > 0);
      if (!main) continue;
      const rest = garments.filter((p) => p !== main && p.variants.some((v) => v.stock > 0));
      const other = rest.find((p) => p.occasions.includes(occasion)) ?? rest[0];
      if (other) return { occasion: OCCASIONS[occasion].toLowerCase(), size, main, stock: stockOf(main, size), other };
    }
  }
  return null;
}
