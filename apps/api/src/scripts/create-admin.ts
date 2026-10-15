import { createDb, upsertAdmin } from "@mini-galu/db";

/**
 * Cuenta del taller en producción: `node dist/admin.js` con DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD (y ADMIN_NAME).
 * Crea la cuenta o le cambia la contraseña; no toca nada más (el seed borra el catálogo y siembra datos de demo).
 * El primer ingreso al panel pide activar la verificación en dos pasos.
 */
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✗ Falta DATABASE_URL");
  process.exit(1);
}
const db = createDb(url, { max: 1 });
try {
  console.log(`✓ cuenta del taller lista: ${await upsertAdmin(db)}`);
} catch (err) {
  console.error(`✗ ${err instanceof Error ? err.message : err}`);
  process.exitCode = 1;
} finally {
  await db.close();
}
