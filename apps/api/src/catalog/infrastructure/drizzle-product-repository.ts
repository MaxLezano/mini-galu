import type { Fit, Occasion, Size } from "@mini-galu/contracts";
import { and, asc, avg, count, type Db, desc, eq, gt, inArray, isNull, type SQL, schema as s } from "@mini-galu/db";
import type {
  CollectionRow,
  FeaturedReviewRow,
  NewWaitlistEntry,
  ProductRepository,
  WaitlistRepository,
} from "../application/ports";
import type { Product, Review } from "../domain/product";

export class DrizzleProductRepository implements ProductRepository {
  constructor(protected readonly db: Db) {}

  findPublished() {
    return this.load(eq(s.products.status, "published"));
  }

  async findBySlug(slug: string) {
    const [p] = await this.load(eq(s.products.slug, slug));
    return p ?? null;
  }

  async findReviews(productId: string): Promise<Review[]> {
    const rows = await this.db
      .select()
      .from(s.reviews)
      .where(and(eq(s.reviews.productId, productId), eq(s.reviews.approved, true)))
      .orderBy(asc(s.reviews.createdAt));
    return rows
      .filter((r) => r.title) // las reseñas sin título son las cortas de la home
      .map((r) => ({
        author: r.author,
        city: r.city,
        rating: r.rating,
        title: r.title,
        body: r.body,
        size: r.size as Size | null,
        fit: r.fit as Fit | null,
        createdAt: r.createdAt,
      }));
  }

  async findCollections(): Promise<CollectionRow[]> {
    const rows = await this.db
      .select({
        slug: s.collections.slug,
        name: s.collections.name,
        label: s.collections.label,
        tagline: s.collections.tagline,
        coverPath: s.collections.coverPath,
        launchAt: s.launches.startsAt,
      })
      .from(s.collections)
      .leftJoin(
        s.launches,
        and(
          eq(s.launches.collectionId, s.collections.id),
          eq(s.launches.status, "scheduled"),
          gt(s.launches.startsAt, new Date()),
        ),
      )
      .orderBy(asc(s.collections.position));
    return rows;
  }

  async findFeaturedReviews(limit: number): Promise<FeaturedReviewRow[]> {
    const rows = await this.db
      .select({
        author: s.reviews.author,
        city: s.reviews.city,
        body: s.reviews.body,
        rating: s.reviews.rating,
        productId: s.products.id,
        slug: s.products.slug,
        name: s.products.name,
      })
      .from(s.reviews)
      .innerJoin(s.products, eq(s.products.id, s.reviews.productId))
      .where(and(eq(s.reviews.approved, true), eq(s.reviews.rating, 5), eq(s.reviews.title, "")))
      .orderBy(desc(s.reviews.createdAt))
      .limit(limit);
    if (!rows.length) return [];
    const covers = await this.db
      .select({ productId: s.productImages.productId, path: s.productImages.path })
      .from(s.productImages)
      .where(
        and(
          inArray(
            s.productImages.productId,
            rows.map((r) => r.productId),
          ),
          eq(s.productImages.position, 0),
        ),
      );
    return rows.map((r) => ({
      author: r.author,
      city: r.city,
      body: r.body,
      rating: r.rating,
      product: { slug: r.slug, name: r.name, imagePath: covers.find((c) => c.productId === r.productId)?.path ?? null },
    }));
  }

  async reviewStats() {
    const [r] = await this.db
      .select({ average: avg(s.reviews.rating), count: count() })
      .from(s.reviews)
      .where(eq(s.reviews.approved, true));
    return { average: r?.average ? Math.round(Number(r.average) * 10) / 10 : 0, count: r?.count ?? 0 };
  }

  protected async load(where: SQL): Promise<Product[]> {
    const rows = await this.db
      .select({ p: s.products, col: { slug: s.collections.slug, name: s.collections.name } })
      .from(s.products)
      .innerJoin(s.collections, eq(s.collections.id, s.products.collectionId))
      .where(where);
    if (!rows.length) return [];
    const ids = rows.map((r) => r.p.id);

    const [images, variants, ratings] = await Promise.all([
      this.db
        .select()
        .from(s.productImages)
        .where(inArray(s.productImages.productId, ids))
        .orderBy(asc(s.productImages.position)),
      this.db.select().from(s.variants).where(inArray(s.variants.productId, ids)).orderBy(asc(s.variants.position)),
      this.db
        .select({ productId: s.reviews.productId, average: avg(s.reviews.rating), count: count() })
        .from(s.reviews)
        .where(and(inArray(s.reviews.productId, ids), eq(s.reviews.approved, true)))
        .groupBy(s.reviews.productId),
    ]);

    return rows.map(({ p, col }) => {
      const r = ratings.find((x) => x.productId === p.id);
      return {
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        collection: col,
        color: { name: p.colorName, hex: p.colorHex },
        fabric: p.fabric,
        care: p.care,
        occasions: p.occasions as Occasion[],
        priceCents: p.priceCents,
        compareAtCents: p.compareAtCents,
        tag: p.tag,
        isAccessory: p.isAccessory,
        status: p.status,
        images: images.filter((i) => i.productId === p.id).map((i) => ({ path: i.path, alt: i.alt })),
        variants: variants
          .filter((v) => v.productId === p.id)
          .map((v) => ({ size: v.size as Size, stock: v.stock, measures: v.measures ?? null })),
        unitsSold: p.unitsSold,
        rating: { average: r ? Math.round(Number(r.average) * 10) / 10 : 0, count: r?.count ?? 0 },
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      };
    });
  }
}

export class DrizzleWaitlistRepository implements WaitlistRepository {
  constructor(private readonly db: Db) {}

  async add(e: NewWaitlistEntry) {
    const rows = await this.db
      .insert(s.waitlistEntries)
      .values(e)
      .onConflictDoNothing()
      .returning({ id: s.waitlistEntries.id });
    return rows.length > 0;
  }

  async countPending(productId: string, size: Size | null) {
    const [r] = await this.db
      .select({ n: count() })
      .from(s.waitlistEntries)
      .where(
        and(
          eq(s.waitlistEntries.productId, productId),
          size ? eq(s.waitlistEntries.size, size) : isNull(s.waitlistEntries.size),
          isNull(s.waitlistEntries.notifiedAt),
        ),
      );
    return r?.n ?? 0;
  }
}
