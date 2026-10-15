import { fileURLToPath } from "node:url";
import { createDb, runMigrations } from "@mini-galu/db";

/**
 * Migraciones en producción: `node dist/migrate.js` (antes de arrancar la API en cada deploy).
 * El build copia `packages/db/drizzle` a `dist/drizzle`, así no depende de que esté el monorepo.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ Falta DATABASE_URL");
  process.exit(1);
}
const db = createDb(url, { max: 1 });
await runMigrations(db, fileURLToPath(new URL("./drizzle", import.meta.url)));
await db.close();
console.log("✓ migraciones aplicadas");
