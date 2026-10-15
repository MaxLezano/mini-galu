import { resolve } from "node:path";
import { createDb } from "./client";
import { databaseUrl, repoRoot } from "./env";
import { runMigrations } from "./migrations";

const db = createDb(databaseUrl(), { max: 1 });
await runMigrations(db, resolve(repoRoot, "packages/db/drizzle"));
await db.close();
console.log("✓ migraciones aplicadas");
