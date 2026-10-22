import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { ADMIN, expect, panelReady, test } from "./fixtures";

/**
 * Accesibilidad WCAG 2.1 AA con axe-core en las pantallas principales de la tienda y del panel.
 * `?static` apaga animaciones: axe mide el contraste del estado final, no de un fundido a mitad de camino.
 */
async function auditar(page: Page) {
  await page.waitForLoadState("networkidle");
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const resumen = violations.map((v) => ({
    regla: v.id,
    impacto: v.impact,
    nodos: v.nodes.slice(0, 5).map((n) => `${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1] ?? ""}`),
  }));
  expect(resumen, "violaciones de accesibilidad").toEqual([]);
}

const TIENDA = [
  ["inicio", "/"],
  ["catálogo", "/catalogo"],
  ["ficha", "/producto/mono-verde"],
  ["gift cards", "/giftcards"],
  ["ingresar", "/ingresar"],
  ["seguimiento", "/seguimiento"],
  ["ayuda", "/ayuda/cambios"],
  ["arrepentimiento", "/arrepentimiento"],
] as const;

for (const [nombre, url] of TIENDA) {
  test(`tienda · ${nombre} sin violaciones AA`, async ({ page }) => {
    await page.goto(`${url}${url.includes("?") ? "&" : "?"}static`);
    await auditar(page);
  });
}

test("tienda · bolsa abierta y checkout sin violaciones AA", async ({ page }) => {
  await page.goto("/producto/mono-verde?static");
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await expect(page.locator("#drawer .line-item")).toBeVisible();
  await auditar(page);
  await page.locator("#drawer").getByRole("link", { name: "Ir a pagar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  // se audita el checkout, no el skeleton (mientras carga, Next todavía no puso el título de la página)
  await expect(page.locator("[data-loading]")).toHaveCount(0);
  await auditar(page);
});

test("tienda · Galú y menú abiertos sin violaciones AA", async ({ page }) => {
  await page.goto("/?static");
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  await expect(page.locator(".galu-body")).toBeVisible();
  await auditar(page);
  await page.keyboard.press("Escape");
  if (test.info().project.name === "celular") {
    await page.getByRole("button", { name: "Abrir menú" }).click();
    await auditar(page);
  }
});

test("tienda · cuenta nueva sin violaciones AA", async ({ page }) => {
  await page.goto("/ingresar?crear&static");
  await auditar(page);
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Prueba");
  await auth.getByLabel("Email").fill(`a11y-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`);
  await auth.getByLabel("Contraseña", { exact: true }).fill("Galu.Prueba1");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await auditar(page);
});

const PANEL = [
  "/taller",
  "/taller/pedidos",
  "/taller/productos",
  "/taller/lanzamientos",
  "/taller/clientes",
  "/taller/galu",
  "/taller/reporte",
  "/taller/automatizaciones",
  "/taller/tienda",
  "/taller/seguridad",
] as const;

test("panel · ingresar y pantallas principales sin violaciones AA", async ({ page }) => {
  // axe sobre 10 pantallas en un solo test: con los 30 s de uno común se corta en CI
  test.slow();
  await page.goto("/taller/ingresar?static");
  await auditar(page);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller(\?|$)/);
  for (const url of PANEL) {
    await test.step(url, async () => {
      await page.goto(`${url}?static`);
      await panelReady(page);
      await auditar(page);
    });
  }
});
