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

/** Compra pagada del moño (retiro en el taller, gateway simulado: APRO aprueba). Devuelve el número de pedido. */
export async function buyBow(page: Page, email: string): Promise<string> {
  await page.goto("/producto/mono-verde");
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await page.locator("#drawer").getByRole("link", { name: "Ir a pagar" }).click();
  const step = page.getByRole("region", { name: "Tus datos" });
  await step.getByLabel("Email").fill(email);
  await step.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await step.getByLabel("Apellido").fill("Fernández");
  await step.getByLabel("Celular").fill("11 5555-1234");
  await step.getByRole("button", { name: /Continuar al envío/ }).click();
  await page.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await page.locator(".slots .chip").first().click();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await page.getByLabel("Nombre como figura").fill("APRO");
  await page.locator("#pay").click();
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  const number = /MG-\d+/.exec((await done.textContent()) ?? "")?.[0];
  expect(number).toBeTruthy();
  return number as string;
}
