import { sql } from "drizzle-orm";
import { createDb } from "./client";
import { databaseUrl } from "./env";

const url = databaseUrl();
if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("db:reset solo corre contra una base local");

const db = createDb(url, { max: 1 });
await db.execute(
  sql`DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;`,
);
await db.close();
console.log("✓ base local vacía");
