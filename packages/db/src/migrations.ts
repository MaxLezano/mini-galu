import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Db } from "./client";

/** Aplica las migraciones de `folder` (la carpeta `drizzle/` del paquete, o la copia que lleva el build de la API). */
export async function runMigrations(db: Db, folder: string): Promise<void> {
  await migrate(db, { migrationsFolder: folder });
}
