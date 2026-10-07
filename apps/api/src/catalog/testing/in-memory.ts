import type { Size } from "@mini-galu/contracts";
import type {
  CollectionRow,
  FeaturedReviewRow,
  NewWaitlistEntry,
  ProductRepository,
  WaitlistRepository,
} from "../application/ports";
import type { Product, Review } from "../domain/product";

export class InMemoryProductRepository implements ProductRepository {
  constructor(
    private readonly products: Product[],
    private readonly reviews: Record<string, Review[]> = {},
  ) {}
  async findPublished() {
    return this.products.filter((p) => p.status === "published");
  }
  async findBySlug(slug: string) {
    return this.products.find((p) => p.slug === slug) ?? null;
  }
  async findReviews(productId: string) {
    return this.reviews[productId] ?? [];
  }
  async findCollections(): Promise<CollectionRow[]> {
    const seen = new Map(this.products.map((p) => [p.collection.slug, p.collection]));
    return [...seen.values()].map((c) => ({ ...c, label: c.name, tagline: null, coverPath: null, launchAt: null }));
  }
  async findFeaturedReviews(): Promise<FeaturedReviewRow[]> {
    return [];
  }
  async reviewStats() {
    return { average: 0, count: 0 };
  }
}

export class InMemoryWaitlistRepository implements WaitlistRepository {
  entries: NewWaitlistEntry[] = [];
  async add(e: NewWaitlistEntry) {
    if (this.entries.some((x) => x.productId === e.productId && x.size === e.size && x.contact === e.contact))
      return false;
    this.entries.push(e);
    return true;
  }
  async countPending(productId: string, size: Size | null) {
    return this.entries.filter((x) => x.productId === productId && x.size === size).length;
  }
}
