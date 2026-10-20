import { and, type Db, desc, eq, isNull, schema as s } from "@mini-galu/db";
import type { LaunchVisitRepository, LaunchVisitTarget } from "../application/launch-ports";

export class DrizzleLaunchVisits implements LaunchVisitRepository {
  constructor(private readonly db: Db) {}

  async findPreview(target: LaunchVisitTarget) {
    const cols = { id: s.launches.id, startsAt: s.launches.startsAt, publishedAt: s.launches.publishedAt };
    if ("launchId" in target) {
      const [r] = await this.db.select(cols).from(s.launches).where(eq(s.launches.id, target.launchId)).limit(1);
      return r ?? null;
    }
    // la prenda puede estar en uno viejo y en el que viene: cuenta para el último sin publicar
    const [r] = await this.db
      .select(cols)
      .from(s.launches)
      .innerJoin(s.launchProducts, eq(s.launchProducts.launchId, s.launches.id))
      .innerJoin(s.products, eq(s.products.id, s.launchProducts.productId))
      .where(and(eq(s.products.slug, target.productSlug), isNull(s.launches.publishedAt)))
      .orderBy(desc(s.launches.startsAt))
      .limit(1);
    return r ?? null;
  }

  async add(launchId: string, day: string, visitor: string) {
    const rows = await this.db
      .insert(s.launchVisits)
      .values({ launchId, day, visitor })
      .onConflictDoNothing()
      .returning({ launchId: s.launchVisits.launchId });
    return rows.length > 0;
  }
}
