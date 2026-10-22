import { type Db, eq, schema as s } from "@mini-galu/db";
import type { InstagramStore } from "../application/instagram-feed";
import type { InstagramState } from "../domain/instagram";

const KEY = "instagram";

/** Token renovado y último feed de Instagram, en content_blocks["instagram"]. */
export class DrizzleInstagramStore implements InstagramStore {
  constructor(private readonly db: Db) {}

  async get() {
    const [r] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, KEY));
    return (r?.value as InstagramState | undefined) ?? null;
  }

  async save(value: InstagramState) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value } });
  }
}
