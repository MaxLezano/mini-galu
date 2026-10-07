import type { Page } from "@playwright/test";
import { ADMIN, expect, test } from "./fixtures";

async function login(page: Page) {
  await page.goto("/taller/productos");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller\/productos/);
}

test("el panel pide ingresar y rechaza una contraseña incorrecta", async ({ page }) => {
  await page.goto("/taller/productos");
  await expect(page).toHaveURL(/\/taller\/ingresar\?volver=/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("no-es-la-clave");
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page.locator(".auth-error")).toContainText("no coinciden");
});

test("cargar stock en el panel se ve en la tienda", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();

  // Jumper Mariel: talle 4 tiene 1 → lo sube a 3
  await page.getByRole("button", { name: "Editar Jumper Mariel Bordado" }).first().click();
  const editor = page.getByRole("complementary", { name: "Editar producto" });
  await expect(editor).toHaveAttribute("aria-hidden", "false");
  const stock = editor.getByLabel("Stock talle 4");
  await stock.fill("3");
  await editor.getByRole("button", { name: "Guardar y publicar" }).click();
  await expect(page.locator("#toast")).toContainText("guardado y publicado");

  const shop = await page.context().newPage();
  await shop.goto("/producto/mariel");
  await expect(shop.getByRole("radio", { name: /Talle 4, 3 en stock/ })).toBeVisible();

  // vuelve al valor original
  await page.getByRole("button", { name: "Editar Jumper Mariel Bordado" }).first().click();
  await editor.getByLabel("Stock talle 4").fill("1");
  await editor.getByRole("button", { name: "Guardar y publicar" }).click();
  await expect(page.locator("#toast")).toContainText("guardado y publicado");
});

test("ocultar un producto lo saca del catálogo", async ({ page }) => {
  await login(page);
  const toggle = page.getByLabel("Publicado: Vestido Elsa");
  await toggle.uncheck();
  await expect(page.locator("#toast")).toContainText("oculto de la tienda");
  const shop = await page.context().newPage();
  await shop.goto("/catalogo?instock=0");
  await expect(shop.locator(".grid .p-name", { hasText: "Vestido Elsa" })).toHaveCount(0);
  await toggle.check();
  await expect(page.locator("#toast")).toContainText("publicado");
});
