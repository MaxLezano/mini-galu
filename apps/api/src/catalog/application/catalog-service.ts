import type {
  CatalogQuery,
  Facets,
  FeaturedReview,
  ProductDetail,
  ProductSummary,
  WaitlistRequest,
} from "@mini-galu/contracts";
import { NotFoundError, ValidationError } from "../../shared/domain/errors";
import type { ImageStorage } from "../../shared/media/image-storage";
import {
  completeTheLook,
  filterProducts,
  fitJustoPercent,
  hasSize,
  ratingDistribution,
  stockFor,
} from "../domain/product";
import type { ProductRepository, WaitlistRepository } from "./ports";
import { toCollection, toSummary } from "./presenters";

/** Casos de uso del catálogo. Solo conoce puertos. */
export class CatalogService {
  constructor(
    private readonly products: ProductRepository,
    private readonly waitlist: WaitlistRepository,
    private readonly storage: ImageStorage,
  ) {}

  async list(query: CatalogQuery): Promise<ProductSummary[]> {
    const all = await this.products.findPublished();
    return filterProducts(all, query).map((p) => toSummary(p, this.storage));
  }

  async facets(): Promise<Facets> {
    const [all, cols] = await Promise.all([this.products.findPublished(), this.products.findCollections()]);
    const colors = [...new Map(all.map((p) => [p.color.name, p.color])).values()];
    const prices = all.map((p) => p.priceCents);
    return {
      collections: cols.map((c) =>
        toCollection(c, all.filter((p) => p.collection.slug === c.slug).length, this.storage),
      ),
      colors,
      priceRange: {
        minCents: prices.length ? Math.min(...prices) : 0,
        maxCents: prices.length ? Math.max(...prices) : 0,
      },
      total: all.length,
    };
  }

  async detail(slug: string): Promise<ProductDetail> {
    const p = await this.products.findBySlug(slug);
    if (!p) throw new NotFoundError(`No existe la prenda "${slug}"`);
    const [reviews, all] = await Promise.all([this.products.findReviews(p.id), this.products.findPublished()]);
    return {
      ...toSummary(p, this.storage),
      care: p.care,
      reviews: reviews.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
      ratingDistribution: ratingDistribution(reviews),
      fitJustoPercent: fitJustoPercent(reviews),
      completeTheLook: completeTheLook(p, all).map((x) => toSummary(x, this.storage)),
    };
  }

  async featuredReviews(
    limit = 11,
  ): Promise<{ rating: { average: number; count: number }; featured: FeaturedReview[] }> {
    const [rows, rating] = await Promise.all([this.products.findFeaturedReviews(limit), this.products.reviewStats()]);
    return {
      rating,
      featured: rows.map((r) => ({
        ...r,
        product: { ...r.product, imageUrl: r.product.imagePath ? this.storage.url(r.product.imagePath) : null },
      })),
    };
  }

  /** "Avisame cuando vuelva" (por talle) o "Avisame cuando salga" (modelo en borrador, size null). */
  async joinWaitlist(req: WaitlistRequest): Promise<{ created: boolean; position: number }> {
    const p = await this.products.findBySlug(req.slug);
    if (!p) throw new NotFoundError(`No existe la prenda "${req.slug}"`);
    if (req.size) {
      if (!hasSize(p, req.size)) throw new ValidationError(`"${p.name}" no viene en talle ${req.size}`);
      if (stockFor(p, req.size) > 0)
        throw new ValidationError(`Hay stock en talle ${req.size}: ¡podés comprarlo ahora!`);
    } else if (p.status === "published") {
      throw new ValidationError("Elegí el talle que querés que te avisemos");
    }
    const created = await this.waitlist.add({
      productId: p.id,
      size: req.size,
      channel: req.channel,
      contact: req.contact,
    });
    const position = await this.waitlist.countPending(p.id, req.size);
    return { created, position };
  }
}
