import type { Collection, ProductSummary } from "@mini-galu/contracts";
import type { ImageStorage } from "../../shared/media/image-storage";
import { type Product, sortVariants } from "../domain/product";
import type { CollectionRow } from "./ports";

export function toSummary(p: Product, storage: ImageStorage): ProductSummary {
  return {
    slug: p.slug,
    name: p.name,
    description: p.description,
    collection: p.collection,
    color: p.color,
    fabric: p.fabric,
    occasions: p.occasions,
    priceCents: p.priceCents,
    compareAtCents: p.compareAtCents,
    tag: p.tag,
    isAccessory: p.isAccessory,
    status: p.status,
    images: p.images.map((i) => ({ url: storage.url(i.path), alt: i.alt })),
    variants: sortVariants(p.variants),
    unitsSold: p.unitsSold,
    rating: p.rating,
    createdAt: p.createdAt.toISOString(),
  };
}

export function toCollection(c: CollectionRow, productCount: number, storage: ImageStorage): Collection {
  return {
    slug: c.slug,
    name: c.name,
    label: c.label,
    tagline: c.tagline,
    coverUrl: c.coverPath ? storage.url(c.coverPath) : null,
    productCount,
    launchAt: c.launchAt?.toISOString() ?? null,
  };
}
