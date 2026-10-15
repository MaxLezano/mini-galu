import { HELP_TOPICS, type HelpPageInput, type HelpTopic } from "@mini-galu/contracts";
import { type Db, eq, inArray, schema as s } from "@mini-galu/db";
import type { HelpRepository, StoredHelpPage } from "../application/help-ports";

/** Cada página editada es un content_block `help.<tema>`. */
const key = (topic: HelpTopic) => `help.${topic}`;

export class DrizzleHelpRepository implements HelpRepository {
  constructor(private readonly db: Db) {}

  async findAll() {
    const rows = await this.db
      .select()
      .from(s.contentBlocks)
      .where(inArray(s.contentBlocks.key, HELP_TOPICS.map(key)));
    const pages = new Map<HelpTopic, StoredHelpPage>();
    for (const r of rows) {
      const topic = HELP_TOPICS.find((t) => key(t) === r.key);
      if (topic) pages.set(topic, { page: r.value as HelpPageInput, updatedAt: r.updatedAt });
    }
    return pages;
  }

  async save(topic: HelpTopic, page: HelpPageInput) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: key(topic), value: page })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value: page, updatedAt: new Date() } });
  }

  async remove(topic: HelpTopic) {
    await this.db.delete(s.contentBlocks).where(eq(s.contentBlocks.key, key(topic)));
  }
}
