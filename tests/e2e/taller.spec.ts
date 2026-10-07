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

test("entrar por /taller lleva al panel y salir vuelve a ingresar", async ({ page }) => {
  await page.goto("/taller");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller\/productos/);
  await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
  // en celular la salida está en el menú lateral
  const burger = page.getByRole("button", { name: "Abrir menú" });
  if (await burger.isVisible()) await burger.click();
  await page.getByRole("button", { name: "Salir del panel" }).click();
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.goto("/taller/productos");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
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

test("editar la portada se ve en la home", async ({ page }) => {
  await login(page);
  await page.goto("/taller/tienda");
  const eyebrow = page.getByLabel("Etiqueta");
  const original = await eyebrow.inputValue();
  await eyebrow.fill("Prueba e2e");
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await expect(page.locator("#toast")).toContainText("Portada publicada");

  const shop = await page.context().newPage();
  await shop.goto("/");
  await expect(shop.locator(".hero .eyebrow")).toHaveText("Prueba e2e");

  await eyebrow.fill(original);
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await expect(page.locator("#toast")).toContainText("Portada publicada");
});

test("crear un lanzamiento como borrador y borrarlo", async ({ page }) => {
  await login(page);
  await page.goto("/taller/lanzamientos");
  await page.getByRole("button", { name: "Nuevo lanzamiento" }).click();
  const modal = page.getByRole("dialog", { name: "Lanzamiento" });
  await modal.getByLabel("Nombre").fill("Prueba e2e 99");
  await modal.getByLabel("Adelanto").fill("Un lanzamiento de prueba.");
  await modal.getByRole("button", { name: "Guardar como borrador" }).click();
  await expect(page.locator("#toast")).toContainText("borrador");
  const card = page.locator(".ln", { hasText: "Prueba e2e" });
  await expect(card).toContainText("Borrador");

  // programarlo sin prendas no se puede: abre el editor con el motivo
  await card.getByRole("button", { name: "Programar" }).click();
  await expect(page.locator("#toast")).toContainText("Elegí al menos una prenda");
  await page.keyboard.press("Escape");

  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: /Borrar/ }).click();
  await expect(page.locator(".ln", { hasText: "Prueba e2e" })).toHaveCount(0);
});
