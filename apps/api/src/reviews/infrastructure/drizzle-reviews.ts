import type { Fit } from "@mini-galu/contracts";
import { and, type Db, desc, eq, inArray, schema as s } from "@mini-galu/db";
import type { NewReview, ReviewOrder, ReviewRepository, ReviewRow } from "../application/ports";
import type { Moderated } from "../domain/review";

export class DrizzleReviews implements ReviewRepository {
  constructor(
    private readonly db: Db,
    private readonly formatNumber: (n: number) => string,
    private readonly parseNumber: (s: string) => number | null,
  ) {}

  async findOrder(number: string): Promise<ReviewOrder | null> {
    const n = this.parseNumber(number);
    if (!n) return null;
    const [o] = await this.db.select().from(s.orders).where(eq(s.orders.number, n));
    if (!o) return null;
    // la prenda por su talle; si el talle ya no existe, por el slug
    const items = await this.db
      .select({
        id: s.orderItems.id,
        slug: s.orderItems.productSlug,
        name: s.orderItems.name,
        size: s.orderItems.size,
        imagePath: s.orderItems.imagePath,
        byVariant: s.variants.productId,
        bySlug: s.products.id,
      })
      .from(s.orderItems)
      .leftJoin(s.variants, eq(s.variants.id, s.orderItems.variantId))
      .leftJoin(s.products, eq(s.products.slug, s.orderItems.productSlug))
      .where(eq(s.orderItems.orderId, o.id));
    return {
      id: o.id,
      number: this.formatNumber(o.number),
      accessToken: o.accessToken,
      status: o.status,
      firstName: o.firstName,
      lastName: o.lastName,
      city: o.shippingAddress?.city ?? null,
      items: items.map(({ byVariant, bySlug, ...i }) => ({ ...i, productId: byVariant ?? bySlug })),
    };
  }

  async ofItems(ids: string[]) {
    if (!ids.length) return [];
    const rows = await this.db
      .select({
        orderItemId: s.reviews.orderItemId,
        rating: s.reviews.rating,
        body: s.reviews.body,
        photoPath: s.reviews.photoPath,
        status: s.reviews.status,
      })
      .from(s.reviews)
      .where(inArray(s.reviews.orderItemId, ids));
    return rows.map((r) => ({ ...r, orderItemId: r.orderItemId as string }));
  }

  async add(r: NewReview) {
    const rows = await this.db
      .insert(s.reviews)
      .values({ ...r, title: "", status: "pendiente" })
      .onConflictDoNothing()
      .returning({ id: s.reviews.id });
    return rows.length > 0;
  }

  async list() {
    return this.select();
  }

  async find(id: string) {
    const [r] = await this.select(id);
    return r ?? null;
  }

  async update(id: string, v: Moderated) {
    await this.db.update(s.reviews).set(v).where(eq(s.reviews.id, id));
  }

  private async select(id?: string): Promise<ReviewRow[]> {
    const rows = await this.db
      .select({
        r: s.reviews,
        slug: s.products.slug,
        name: s.products.name,
        productId: s.products.id,
        orderNumber: s.orders.number,
      })
      .from(s.reviews)
      .innerJoin(s.products, eq(s.products.id, s.reviews.productId))
      .leftJoin(s.orderItems, eq(s.orderItems.id, s.reviews.orderItemId))
      .leftJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .where(id ? eq(s.reviews.id, id) : undefined)
      .orderBy(desc(s.reviews.createdAt));
    if (!rows.length) return [];
    const covers = await this.db
      .select({ productId: s.productImages.productId, path: s.productImages.path })
      .from(s.productImages)
      .where(
        and(
          inArray(s.productImages.productId, [...new Set(rows.map((x) => x.productId))]),
          eq(s.productImages.position, 0),
        ),
      );
    return rows.map(({ r, slug, name, productId, orderNumber }) => ({
      id: r.id,
      status: r.status,
      featured: r.featured,
      rating: r.rating,
      title: r.title,
      body: r.body,
      author: r.author,
      city: r.city,
      size: r.size,
      fit: r.fit as Fit | null,
      photoPath: r.photoPath,
      product: { slug, name, imagePath: covers.find((c) => c.productId === productId)?.path ?? null },
      orderNumber: orderNumber ? this.formatNumber(orderNumber) : null,
      createdAt: r.createdAt,
    }));
  }
}
