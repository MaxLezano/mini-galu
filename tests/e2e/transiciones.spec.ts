import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Anota los pseudo-elementos que anima cada view transition (`::view-transition-old(product-hero)`, …) y el
 * nombre de la animación, para ver qué se movió sin depender del tiempo.
 */
async function recordTransitions(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __vt: string[] };
    w.__vt = [];
    const start = document.startViewTransition?.bind(document);
    if (!start) return;
    document.startViewTransition = ((arg: Parameters<typeof start>[0]) => {
      const t = start(arg);
      t.ready
        .then(() => {
          for (const a of document.getAnimations()) {
            const fx = a.effect as KeyframeEffect | null;
            if (fx?.pseudoElement?.startsWith("::view-transition"))
              w.__vt.push(`${fx.pseudoElement} ${(a as CSSAnimation).animationName ?? ""}`);
          }
        })
        .catch(() => {});
      return t;
    }) as typeof start;
  });
}

const recorded = (page: Page) => page.evaluate(() => (window as unknown as { __vt: string[] }).__vt);

/**
 * React anima recién cuando llega la página nueva: contra `next dev` la primera visita compila la ruta y en celular
 * pasaba los 5 s del expect (al repetirlo ya estaba compilada). Se piden antes para medir solo la transición.
 */
async function warmUp(page: Page, ...paths: string[]) {
  for (const path of paths) expect((await page.request.get(path)).ok()).toBe(true);
}
const NAV = { timeout: 15_000 };

test("transiciones: la página se desvanece al navegar y la foto de la tarjeta viaja a la ficha", async ({ page }) => {
  await recordTransitions(page);
  await page.goto("/catalogo");
  const card = page.locator(".grid .p-card").first();
  const slug = (await card.locator(".p-media").getAttribute("href"))?.split("/").pop();
  await warmUp(page, `/producto/${slug}`, "/");
  await card.locator(".p-name a").click();
  await expect(page).toHaveURL(new RegExp(`/producto/${slug}$`), NAV);

  await expect
    .poll(() => recorded(page), NAV)
    .toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^::view-transition-old\(product-hero\)/),
        expect.stringMatching(/^::view-transition-new\(product-hero\)/),
        expect.stringMatching(/^::view-transition-old\(.+\) vtOut$/),
        expect.stringMatching(/^::view-transition-new\(.+\) vtIn$/),
      ]),
    );
  // el header queda quieto
  expect((await recorded(page)).filter((v) => v.startsWith("::view-transition-group(site-header)"))).toEqual([]);

  // de la ficha al inicio: anima la página y no queda ninguna foto con el nombre de la ficha
  await page.evaluate(() => {
    (window as unknown as { __vt: string[] }).__vt = [];
  });
  await page.locator(".logo").first().click();
  await expect(page).toHaveURL(/\/$/, NAV);
  await expect.poll(() => recorded(page), NAV).toEqual(expect.arrayContaining([expect.stringMatching(/vtIn$/)]));
  await expect(page.locator('[style*="product-hero"]')).toHaveCount(0);
});

test("transiciones: con ?static la página cambia sin animar", async ({ page }) => {
  await recordTransitions(page);
  await page.goto("/catalogo?static");
  const link = page.locator(".grid .p-card .p-name a").first();
  await warmUp(page, (await link.getAttribute("href")) ?? "/");
  await link.click();
  await expect(page).toHaveURL(/\/producto\//, NAV);
  await expect(page.locator(".pdp-main")).toBeVisible();
  expect((await recorded(page)).filter((v) => /vtOut|vtIn/.test(v))).toEqual([]);
});
