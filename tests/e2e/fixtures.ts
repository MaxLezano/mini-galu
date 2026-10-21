import { test as base, expect, type Page } from "@playwright/test";

/** Todos los e2e fallan si React reporta un error de hidratación (server y cliente renderizaron distinto). */
export const test = base.extend<{ hydrationGuard: undefined }>({
  hydrationGuard: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && /hydrat/i.test(m.text())) errors.push(m.text().slice(0, 500));
      });
      await use(undefined);
      expect(errors, "errores de hidratación").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export const ADMIN = {
  email: process.env.ADMIN_EMAIL || "gaby@minigalu.com.ar",
  password: process.env.ADMIN_PASSWORD || "Taller.MiniGalu1",
};

/**
 * La sección del panel ya hidrató. El layout (AdminShell, que agrega `adm-body`) hidrata antes que la página, que
 * llega por streaming dentro del Suspense del `loading.tsx`: se espera a que React haya tomado el `<main>` de la
 * sección (su fiber) y a que el hilo quede libre (hidrata de a tandas). Un click antes podía perderse.
 */
export async function panelReady(page: Page) {
  await expect(page.locator("body.adm-body")).toBeAttached();
  await page.waitForFunction(() => {
    const main = document.querySelector("main.adm-content:not([data-loading])");
    if (!main || !Object.keys(main).some((k) => k.startsWith("__reactFiber$"))) return false;
    return new Promise((ok) => requestIdleCallback(() => ok(true)));
  });
}
