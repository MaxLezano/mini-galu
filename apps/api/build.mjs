// Build de producción de la API: un bundle ESM por entrada en dist/ (node dist/main.js).
// Los paquetes del monorepo exportan .ts y van adentro; sharp queda afuera porque es nativo.
import { cp, rm } from "node:fs/promises";
import { build } from "esbuild";

await rm("dist", { recursive: true, force: true });
await build({
  entryPoints: { main: "src/main.ts", migrate: "src/scripts/migrate.ts", admin: "src/scripts/create-admin.ts" },
  outdir: "dist",
  bundle: true,
  platform: "node",
  target: "node24",
  format: "esm",
  sourcemap: true,
  external: ["sharp"],
  // dependencias CommonJS (nodemailer, postgres…) llaman a require() dentro del bundle ESM
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
await cp("../../packages/db/drizzle", "dist/drizzle", { recursive: true });
