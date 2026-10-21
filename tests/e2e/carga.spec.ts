import type { Page } from "@playwright/test";
import { ADMIN, expect, test } from "./fixtures";

/**
 * Conexión lenta (Chrome DevTools Protocol): el payload de la página nueva llega de a poco, así se ve el skeleton
 * de `loading.tsx` tanto contra `next dev` (que no prefetchea) como en producción.
 */
async function slowNetwork(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 400,
    downloadThroughput: 24 * 1024,
    uploadThroughput: 24 * 1024,
  });
}

/**
 * Anota cada skeleton que se monta y si en ese momento seguía en pantalla algo de la página anterior (`old`), sin
 * depender de cuánto dura la carga.
 */
async function watchSkeletons(page: Page, old: string) {
  await page.evaluate((old) => {
    const w = window as unknown as { __skel: { shape: string; stale: boolean }[] };
    w.__skel = [];
    new MutationObserver(() => {
      for (const el of document.querySelectorAll<HTMLElement>("[data-loading]:not([data-seen])")) {
        el.dataset.seen = "";
        w.__skel.push({ shape: el.className, stale: !!document.querySelector(old) });
      }
    }).observe(document.body, { childList: true, subtree: true });
  }, old);
}

const seen = (page: Page) =>
  page.evaluate(() => (window as unknown as { __skel: { shape: string; stale: boolean }[] }).__skel);

const NAV = { timeout: 30_000 };

test("carga: al navegar en la tienda se ve el skeleton de la página nueva y no queda la anterior", async ({ page }) => {
  await page.goto("/catalogo?static");
  const link = page.locator(".grid .p-card .p-name a").first();
  // la ruta ya compilada (next dev compila cada ruta la primera vez)
  expect((await page.request.get((await link.getAttribute("href")) ?? "/")).ok()).toBe(true);
  await slowNetwork(page);
  await watchSkeletons(page, ".cat-hero");
  await link.click();

  await expect(page.locator("[data-loading] .pdp-skel-photo")).toBeVisible(NAV);
  await expect(page.locator(".cat-hero")).toHaveCount(0);
  await expect(page.getByRole("status").filter({ hasText: "Cargando…" })).toBeAttached();
  // llega la ficha y el skeleton se va
  await expect(page.locator(".pdp-main")).toBeVisible(NAV);
  await expect(page.locator("[data-loading]")).toHaveCount(0);
  expect(await seen(page)).toEqual([expect.objectContaining({ stale: false })]);
});

test("carga: en el panel, cambiar de sección muestra el skeleton de la lista", async ({ page }) => {
  await page.goto("/taller/pedidos?static");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Pedidos" })).toBeVisible(NAV);
  expect((await page.request.get("/taller/clientes")).ok()).toBe(true);
  await slowNetwork(page);
  await watchSkeletons(page, ".adm-content:not([data-loading])");

  const nav = test.info().project.name === "celular" ? ".adm-tabbar" : ".adm-side";
  const clientes = page.locator(`${nav} a[href="/taller/clientes"]`);
  // en celular Clientes puede no estar en la barra de abajo: se navega desde la lateral
  if (await clientes.count()) await clientes.click();
  else await page.evaluate(() => (document.querySelector('a[href="/taller/clientes"]') as HTMLElement).click());

  await expect(page.locator(".adm-content[data-loading] .skel-row").first()).toBeVisible(NAV);
  await expect(page.getByRole("heading", { level: 1, name: "Clientes" })).toBeVisible(NAV);
  await expect(page.locator("[data-loading]")).toHaveCount(0);
  expect(await seen(page)).toEqual([expect.objectContaining({ stale: false })]);
});
