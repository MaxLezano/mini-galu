import { resolve } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { createDb } from "./client";
import { databaseUrl, repoRoot } from "./env";

const db = createDb(databaseUrl(), { max: 1 });
await migrate(db, { migrationsFolder: resolve(repoRoot, "packages/db/drizzle") });
await db.close();
console.log("✓ migraciones aplicadas");
