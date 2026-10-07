import type { ProductStatus, Size } from "@mini-galu/contracts";
import { and, count, eq, inArray, isNull, schema as s, sql } from "@mini-galu/db";
import type { AdminProductRepository, PendingWaitlist, ProductWrite } from "../application/admin-ports";
import { DrizzleProductRepository } from "./drizzle-product-repository";

type Tx = Parameters<Parameters<DrizzleProductRepository["db"]["transaction"]>[0]>[0];

export class DrizzleAdminProductRepository extends DrizzleProductRepository implements AdminProductRepository {
  findAll() {
    return this.load(sql`true`);
  }

  async slugs() {
    const rows = await this.db.select({ slug: s.products.slug }).from(s.products);
    return new Set(rows.map((r) => r.slug));
  }

  async collectionExists(slug: string) {
    const [r] = await this.db.select({ id: s.collections.id }).from(s.collections).where(eq(s.collections.slug, slug));
    return !!r;
  }

  async create(p: ProductWrite) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(s.products)
        .values({ ...this.columns(p, await this.collectionId(tx, p.collectionSlug)), slug: p.slug })
        .returning({ id: s.products.id });
      if (row) await this.replaceChildren(tx, row.id, p);
    });
  }

  async update(slug: string, p: ProductWrite) {
    await this.db.transaction(async (tx) => {
      const [row] = await tx
        .update(s.products)
        .set(this.columns(p, await this.collectionId(tx, p.collectionSlug)))
        .where(eq(s.products.slug, slug))
        .returning({ id: s.products.id });
      if (row) await this.replaceChildren(tx, row.id, p);
    });
  }

  async setStatus(slug: string, status: ProductStatus) {
    await this.db.update(s.products).set({ status }).where(eq(s.products.slug, slug));
  }

  async pendingWaitlist(productIds: string[]): Promise<PendingWaitlist[]> {
    if (!productIds.length) return [];
    const rows = await this.db
      .select({ productId: s.waitlistEntries.productId, size: s.waitlistEntries.size, count: count() })
      .from(s.waitlistEntries)
      .where(and(inArray(s.waitlistEntries.productId, productIds), isNull(s.waitlistEntries.notifiedAt)))
      .groupBy(s.waitlistEntries.productId, s.waitlistEntries.size);
    return rows.map((r) => ({ ...r, size: r.size as Size | null }));
  }

  private async collectionId(tx: Tx, slug: string) {
    const [c] = await tx.select({ id: s.collections.id }).from(s.collections).where(eq(s.collections.slug, slug));
    if (!c) throw new Error(`Colección inexistente: ${slug}`);
    return c.id;
  }

  private columns(p: ProductWrite, collectionId: string) {
    return {
      name: p.name,
      description: p.description,
      collectionId,
      colorName: p.color.name,
      colorHex: p.color.hex,
      fabric: p.fabric,
      care: p.care,
      occasions: p.occasions,
      priceCents: p.priceCents,
      compareAtCents: p.compareAtCents,
      tag: p.tag,
      isAccessory: p.isAccessory,
      status: p.status,
    };
  }

  /** Fotos y talles se reemplazan completos (el orden de la lista es el orden en la tienda). */
  private async replaceChildren(tx: Tx, productId: string, p: ProductWrite) {
    await tx.delete(s.productImages).where(eq(s.productImages.productId, productId));
    if (p.images.length)
      await tx
        .insert(s.productImages)
        .values(p.images.map((im, position) => ({ productId, path: im.path, alt: im.alt, position })));

    // los talles se actualizan en el lugar (upsert) para no perder la identidad de la variante (pedidos, fase 3)
    const sizes = p.variants.map((v) => v.size);
    await tx
      .delete(s.variants)
      .where(
        and(eq(s.variants.productId, productId), sizes.length ? sql`${s.variants.size} NOT IN ${sizes}` : sql`true`),
      );
    for (const [position, v] of p.variants.entries()) {
      await tx
        .insert(s.variants)
        .values({ productId, size: v.size, stock: v.stock, measures: v.measures, position })
        .onConflictDoUpdate({
          target: [s.variants.productId, s.variants.size],
          set: { stock: v.stock, measures: v.measures, position },
        });
    }
  }
}
