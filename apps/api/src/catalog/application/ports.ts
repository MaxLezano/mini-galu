import type { ContactChannel, Size } from "@mini-galu/contracts";
import type { Product, Review } from "../domain/product";

export type CollectionRow = {
  slug: string;
  name: string;
  label: string;
  tagline: string | null;
  coverPath: string | null;
  launchAt: Date | null;
};

export interface ProductRepository {
  /** Todo lo publicado (el catálogo de un taller es chico: se filtra en el dominio). */
  findPublished(): Promise<Product[]>;
  /** Por slug, incluye borradores (la ficha de un lanzamiento se puede ver antes de salir). */
  findBySlug(slug: string): Promise<Product | null>;
  /** Las publicadas, las más nuevas primero. */
  findReviews(productId: string): Promise<Review[]>;
  findCollections(): Promise<CollectionRow[]>;
  /** Las que Gaby eligió para la home (publicadas, las más recientes primero) con su prenda. */
  findFeaturedReviews(limit: number): Promise<FeaturedReviewRow[]>;
  /** Promedio y cantidad de todas las publicadas. */
  reviewStats(): Promise<{ average: number; count: number }>;
}

export type FeaturedReviewRow = {
  author: string;
  city: string | null;
  body: string;
  rating: number;
  photoPath: string | null;
  product: { slug: string; name: string; imagePath: string | null };
};

export type NewWaitlistEntry = { productId: string; size: Size | null; channel: ContactChannel; contact: string };

export interface WaitlistRepository {
  /** Devuelve false si ya estaba anotada (idempotente). */
  add(entry: NewWaitlistEntry): Promise<boolean>;
  countPending(productId: string, size: Size | null): Promise<number>;
}
