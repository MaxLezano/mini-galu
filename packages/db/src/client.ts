import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Neon da la URL con `channel_binding=require`: postgres.js no lo conoce y lo mandaría como parámetro de sesión
 * (Postgres lo rechaza). `sslmode` sí lo entiende.
 */
function withoutChannelBinding(url: string): string {
  if (!url.includes("channel_binding")) return url;
  const u = new URL(url);
  u.searchParams.delete("channel_binding");
  return u.toString();
}

export function createDb(url: string, opts: { max?: number } = {}) {
  const sql = postgres(withoutChannelBinding(url), { max: opts.max ?? 10, onnotice: () => {} });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  return Object.assign(db, { close: () => sql.end() });
}

export type Db = ReturnType<typeof createDb>;
