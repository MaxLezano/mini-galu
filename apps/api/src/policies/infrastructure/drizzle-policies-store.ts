import { type StorePolicies, StorePoliciesSchema } from "@mini-galu/contracts";
import { type Db, eq, schema as s } from "@mini-galu/db";
import type { PoliciesStore } from "../application/ports";

const KEY = "policies";

/** Políticas del panel en content_blocks["policies"]. */
export class DrizzlePoliciesStore implements PoliciesStore {
  constructor(private readonly db: Db) {}

  async get(): Promise<StorePolicies | null> {
    const [r] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, KEY));
    const parsed = StorePoliciesSchema.safeParse(r?.value);
    return parsed.success ? parsed.data : null;
  }

  async save(value: StorePolicies) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value } });
  }
}
