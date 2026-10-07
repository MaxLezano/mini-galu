import type { ProductStatus, Size } from "@mini-galu/contracts";
import type { AdminProductRepository, PendingWaitlist, ProductWrite } from "../application/admin-ports";
import type { Product } from "../domain/product";
import { makeProduct } from "./fixtures";

export class InMemoryAdminProductRepository implements AdminProductRepository {
  waits: { productId: string; size: Size | null }[] = [];
  constructor(
    public products: Product[] = [],
    private readonly collections = ["verano-2027", "fiestas"],
  ) {}

  async findAll() {
    return this.products;
  }
  async findBySlug(slug: string) {
    return this.products.find((p) => p.slug === slug) ?? null;
  }
  async slugs() {
    return new Set(this.products.map((p) => p.slug));
  }
  async collectionExists(slug: string) {
    return this.collections.includes(slug);
  }
  async create(p: ProductWrite) {
    this.products.push(this.toProduct(p, `p-${p.slug}`));
  }
  async update(slug: string, p: ProductWrite) {
    const i = this.products.findIndex((x) => x.slug === slug);
    const old = this.products[i];
    if (old) this.products[i] = { ...this.toProduct(p, old.id), createdAt: old.createdAt };
  }
  async setStatus(slug: string, status: ProductStatus) {
    const p = this.products.find((x) => x.slug === slug);
    if (p) p.status = status;
  }
  async pendingWaitlist(ids: string[]): Promise<PendingWaitlist[]> {
    const out: PendingWaitlist[] = [];
    for (const w of this.waits.filter((x) => ids.includes(x.productId))) {
      const hit = out.find((o) => o.productId === w.productId && o.size === w.size);
      if (hit) hit.count++;
      else out.push({ ...w, count: 1 });
    }
    return out;
  }

  private toProduct(p: ProductWrite, id: string): Product {
    return makeProduct({
      id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      collection: { slug: p.collectionSlug, name: p.collectionSlug },
      color: p.color,
      fabric: p.fabric,
      care: p.care,
      occasions: p.occasions,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents,
      tag: p.tag,
      isAccessory: p.isAccessory,
      status: p.status,
      images: p.images,
      variants: p.variants,
    });
  }
}
