import type { ProductInput, ProductStatus, Size } from "@mini-galu/contracts";
import type { Product } from "../domain/product";

export type ProductWrite = ProductInput & { slug: string };

export type PendingWaitlist = { productId: string; size: Size | null; count: number };

/** Escritura del catálogo desde el panel del taller. */
export interface AdminProductRepository {
  /** Todo, incluidos los borradores. */
  findAll(): Promise<Product[]>;
  findBySlug(slug: string): Promise<Product | null>;
  slugs(): Promise<Set<string>>;
  collectionExists(slug: string): Promise<boolean>;
  create(p: ProductWrite): Promise<void>;
  /** Reemplaza datos, fotos y talles en una transacción. */
  update(slug: string, p: ProductWrite): Promise<void>;
  setStatus(slug: string, status: ProductStatus): Promise<void>;
  pendingWaitlist(productIds: string[]): Promise<PendingWaitlist[]>;
}
