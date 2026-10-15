import { defineConfig, devices } from "@playwright/test";

/**
 * E2E de la tienda. Necesita la base con seed (pnpm db:up && pnpm db:reset).
 * Si web/api ya están corriendo (pnpm dev) los reutiliza.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1, // los tests del panel cambian datos: uno a la vez
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "escritorio", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: [
    // la API corre con el mismo bundle que va a producción (si no hay una levantada con pnpm dev)
    {
      command: "pnpm --filter @mini-galu/api build && pnpm --filter @mini-galu/api start",
      url: "http://localhost:4000/health",
      reuseExistingServer: true,
    },
    {
      command: "pnpm --filter @mini-galu/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
