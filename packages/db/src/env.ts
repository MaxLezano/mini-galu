import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Raíz del monorepo: sube desde cwd hasta encontrar pnpm-workspace.yaml (drizzle-kit carga esto como CJS, sin import.meta). */
function findRepoRoot(from = process.cwd()): string {
  let dir = from;
  while (!existsSync(resolve(dir, "pnpm-workspace.yaml"))) {
    const up = dirname(dir);
    if (up === dir) throw new Error("No encuentro la raíz del monorepo (pnpm-workspace.yaml)");
    dir = up;
  }
  return dir;
}

let root: string | undefined;
/** Se busca al usarla, no al importar: el bundle de la API corre fuera del monorepo (Docker). */
export const repoRoot = () => (root ??= findRepoRoot());

/** Lee DATABASE_URL del entorno o del .env de la raíz (los scripts de db corren fuera de turbo). */
export function databaseUrl(): string {
  if (!process.env.DATABASE_URL) {
    const envFile = resolve(repoRoot(), ".env");
    if (existsSync(envFile)) process.loadEnvFile(envFile);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL (copiá .env.example a .env)");
  return url;
}
