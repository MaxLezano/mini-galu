import { type ShippingSettings, ShippingSettingsSchema } from "@mini-galu/contracts";
import { type Db, eq, schema as s } from "@mini-galu/db";
import type { ShippingSettingsStore } from "../application/ports";

const KEY = "shipping";

/** Ajustes de envío del panel en content_blocks["shipping"]. */
export class DrizzleShippingSettings implements ShippingSettingsStore {
  constructor(private readonly db: Db) {}

  async get(): Promise<ShippingSettings | null> {
    const [r] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, KEY));
    const parsed = ShippingSettingsSchema.safeParse(r?.value);
    return parsed.success ? parsed.data : null;
  }

  async save(value: ShippingSettings) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value } });
  }
}
