import type { LaunchInput, ProductStatus } from "@mini-galu/contracts";
import { asc, count, type Db, eq, inArray, schema as s } from "@mini-galu/db";
import type { AdminLaunchRepository, LaunchRecord } from "../application/launch-ports";

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

export class DrizzleAdminLaunchRepository implements AdminLaunchRepository {
  constructor(private readonly db: Db) {}

  async findAll() {
    return this.load();
  }

  async findById(id: string) {
    const [l] = await this.load(id);
    return l ?? null;
  }

  async missingProducts(slugs: string[]) {
    if (!slugs.length) return [];
    const rows = await this.db
      .select({ slug: s.products.slug })
      .from(s.products)
      .where(inArray(s.products.slug, slugs));
    const found = new Set(rows.map((r) => r.slug));
    return slugs.filter((x) => !found.has(x));
  }

  async collectionExists(slug: string) {
    const [r] = await this.db.select({ id: s.collections.id }).from(s.collections).where(eq(s.collections.slug, slug));
    return !!r;
  }

  async create(input: LaunchInput) {
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(s.launches)
        .values(await this.columns(tx, input))
        .returning({ id: s.launches.id });
      if (!row) throw new Error("No se creó el lanzamiento");
      await this.replaceProducts(tx, row.id, input.productSlugs);
      return row.id;
    });
  }

  async update(id: string, input: LaunchInput) {
    await this.db.transaction(async (tx) => {
      await tx
        .update(s.launches)
        .set(await this.columns(tx, input))
        .where(eq(s.launches.id, id));
      await this.replaceProducts(tx, id, input.productSlugs);
    });
  }

  async delete(id: string) {
    await this.db.delete(s.launches).where(eq(s.launches.id, id));
  }

  async markPublished(id: string, at: Date) {
    await this.db.update(s.launches).set({ publishedAt: at }).where(eq(s.launches.id, id));
  }

  private async columns(tx: Tx, i: LaunchInput) {
    let collectionId: string | null = null;
    if (i.collectionSlug) {
      const [c] = await tx
        .select({ id: s.collections.id })
        .from(s.collections)
        .where(eq(s.collections.slug, i.collectionSlug));
      collectionId = c?.id ?? null;
    }
    return {
      title: i.title,
      coverNote: i.coverNote,
      teaser: i.teaser,
      coverPath: i.coverPath,
      startsAt: new Date(i.startsAt),
      collectionId,
      showCountdown: i.showCountdown,
      notifyBefore: i.notifyBefore,
      autoPublish: i.autoPublish,
      socialText: i.socialText,
      status: i.status,
    };
  }

  private async replaceProducts(tx: Tx, launchId: string, slugs: string[]) {
    await tx.delete(s.launchProducts).where(eq(s.launchProducts.launchId, launchId));
    if (!slugs.length) return;
    const rows = await tx
      .select({ id: s.products.id, slug: s.products.slug })
      .from(s.products)
      .where(inArray(s.products.slug, slugs));
    const ids = slugs.flatMap((slug) => rows.find((r) => r.slug === slug)?.id ?? []);
    if (ids.length)
      await tx.insert(s.launchProducts).values(ids.map((productId, position) => ({ launchId, productId, position })));
  }

  private async load(id?: string): Promise<LaunchRecord[]> {
    const base = this.db
      .select({ l: s.launches, collectionSlug: s.collections.slug })
      .from(s.launches)
      .leftJoin(s.collections, eq(s.collections.id, s.launches.collectionId));
    const rows = id ? await base.where(eq(s.launches.id, id)) : await base;
    if (!rows.length) return [];
    const ids = rows.map((r) => r.l.id);

    const [prods, signups] = await Promise.all([
      this.db
        .select({
          launchId: s.launchProducts.launchId,
          slug: s.products.slug,
          name: s.products.name,
          status: s.products.status,
          productId: s.products.id,
        })
        .from(s.launchProducts)
        .innerJoin(s.products, eq(s.products.id, s.launchProducts.productId))
        .where(inArray(s.launchProducts.launchId, ids))
        .orderBy(asc(s.launchProducts.position)),
      this.db
        .select({ launchId: s.launchSignups.launchId, n: count() })
        .from(s.launchSignups)
        .where(inArray(s.launchSignups.launchId, ids))
        .groupBy(s.launchSignups.launchId),
    ]);
    const covers = prods.length
      ? await this.db
          .select({ productId: s.productImages.productId, path: s.productImages.path })
          .from(s.productImages)
          .where(
            inArray(
              s.productImages.productId,
              prods.map((p) => p.productId),
            ),
          )
          .orderBy(asc(s.productImages.position))
      : [];

    return rows.map(({ l, collectionSlug }) => ({
      id: l.id,
      title: l.title,
      coverNote: l.coverNote,
      teaser: l.teaser,
      coverPath: l.coverPath,
      startsAt: l.startsAt,
      collectionSlug,
      products: prods
        .filter((p) => p.launchId === l.id)
        .map((p) => ({
          slug: p.slug,
          name: p.name,
          status: p.status as ProductStatus,
          imagePath: covers.find((c) => c.productId === p.productId)?.path ?? null,
        })),
      showCountdown: l.showCountdown,
      notifyBefore: l.notifyBefore,
      autoPublish: l.autoPublish,
      socialText: l.socialText,
      status: l.status,
      publishedAt: l.publishedAt,
      signups: signups.find((x) => x.launchId === l.id)?.n ?? 0,
    }));
  }
}
