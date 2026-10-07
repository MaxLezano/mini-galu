import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export function createDb(url: string, opts: { max?: number } = {}) {
  const sql = postgres(url, { max: opts.max ?? 10, onnotice: () => {} });
  const db = drizzle(sql, { schema, casing: "snake_case" });
  return Object.assign(db, { close: () => sql.end() });
}

export type Db = ReturnType<typeof createDb>;
