import type { ContactChannel, HomeBlock } from "@mini-galu/contracts";
import { and, asc, count, type Db, eq, gt, type SQL, schema as s } from "@mini-galu/db";
import type { ContentRepository, LaunchRow } from "../application/ports";

export class DrizzleContentRepository implements ContentRepository {
  constructor(private readonly db: Db) {}

  async getHomeBlock() {
    const [row] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, "home"));
    return (row?.value as HomeBlock | undefined) ?? null;
  }

  findUpcomingLaunch(now: Date) {
    return this.one(and(eq(s.launches.status, "scheduled"), gt(s.launches.startsAt, now)) as SQL);
  }

  findLaunch(id: string) {
    return this.one(eq(s.launches.id, id));
  }

  async countLaunchSignups(launchId: string) {
    const [r] = await this.db
      .select({ n: count() })
      .from(s.launchSignups)
      .where(eq(s.launchSignups.launchId, launchId));
    return r?.n ?? 0;
  }

  async addLaunchSignup(launchId: string, channel: ContactChannel, contact: string) {
    const rows = await this.db
      .insert(s.launchSignups)
      .values({ launchId, channel, contact })
      .onConflictDoNothing()
      .returning({ id: s.launchSignups.id });
    return rows.length > 0;
  }

  private async one(where: SQL): Promise<LaunchRow | null> {
    const [r] = await this.db
      .select({
        id: s.launches.id,
        title: s.launches.title,
        collectionSlug: s.collections.slug,
        startsAt: s.launches.startsAt,
        teaser: s.launches.teaser,
        coverPath: s.launches.coverPath,
        coverNote: s.launches.coverNote,
        showCountdown: s.launches.showCountdown,
      })
      .from(s.launches)
      .leftJoin(s.collections, eq(s.collections.id, s.launches.collectionId))
      .where(where)
      .orderBy(asc(s.launches.startsAt))
      .limit(1);
    return r ?? null;
  }
}
