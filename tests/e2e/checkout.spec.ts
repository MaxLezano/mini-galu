import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Checkout con el gateway simulado (sin credenciales de Mercado Pago): el titular decide el resultado como en las
 * tarjetas de prueba de MP. Se compra el moño (talle único, el que más stock tiene en el seed): una unidad por test.
 */
async function addBow(page: Page) {
  await page.goto("/producto/mono-verde");
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await expect(page.locator("#drawer .line-item")).toContainText("Moño Verde Largo");
  await page.locator("#drawer").getByRole("link", { name: "Ir a pagar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page, email: string) {
  const step = page.getByRole("region", { name: "Tus datos" });
  await step.getByLabel("Email").fill(email);
  await step.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await step.getByLabel("Apellido").fill("Fernández");
  await step.getByLabel("Celular").fill("11 5555-1234");
  await step.getByRole("button", { name: /Continuar al envío/ }).click();
}

/** En celular el resumen (con el cupón) viene plegado. */
async function openSummary(page: Page) {
  const toggle = page.getByRole("button", { name: /Ver resumen/ });
  if (await toggle.isVisible()) await toggle.click();
}

/** Con credenciales de Mercado Pago en el .env la API usa el Brick real: estos flujos son del gateway simulado. */
async function skipIfRealMercadoPago(request: APIRequestContext) {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
}

const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;

test("compra como invitada con retiro en el taller: rechazo y reintento aprobado", async ({ page, request }) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());

  // valida antes de seguir
  await page.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await expect(page.locator(".field-error")).toContainText("retirar");
  await page.locator(".slots .chip").first().click();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();

  await expect(page.getByText("Te guardamos las prendas 30 minutos")).toBeVisible();
  await page.getByLabel("Nombre como figura").fill("OTHE");
  await page.locator("#pay").click();
  await expect(page.locator(".pay-error")).toContainText("rechazado");

  await page.getByLabel("Nombre como figura").fill("APRO");
  await page.locator("#pay").click();
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  await expect(done).toContainText("¡Gracias, Lucía!");
  await expect(done).toContainText(/Pedido #MG-\d+/);
  await expect(done).toContainText("Villa Crespo");

  // la bolsa quedó vacía
  await page.goto("/checkout");
  await expect(page.getByText("Tu bolsa está vacía").first()).toBeVisible();
});

test("cupón de primera compra y pago con dinero en cuenta", async ({ page, request }) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());

  await openSummary(page);
  const coupon = page.getByLabel("Cupón de descuento");
  await coupon.fill("NOEXISTE");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator("#toast")).toContainText("no existe");
  await coupon.fill("bienvenida10");
  await page.getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator(".applied")).toContainText("BIENVENIDA10 · 10%");

  const ship = page.getByRole("region", { name: "Envío" });
  await ship.getByLabel("Código postal", { exact: true }).fill("5000");
  await ship.getByRole("radio", { name: /Envío a domicilio/ }).check();
  await ship.getByLabel("Calle").fill("Duarte Quirós");
  await ship.getByLabel("Altura").fill("1200");
  await ship.getByLabel("Localidad").fill("Córdoba");
  await ship.getByLabel("Provincia").selectOption("Córdoba");
  await page.getByRole("button", { name: /Continuar al pago/ }).click();

  await page.getByRole("radio", { name: /Dinero en cuenta/ }).check();
  await page.locator("#pay").click();
  // simula la ida y vuelta a Mercado Pago
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  await expect(done).toContainText("Dinero en cuenta MP");
  await expect(done).toContainText("Llega a tu casa");
});

test("la bolsa se guarda en el servidor y sobrevive a borrar el navegador", async ({ page, context }) => {
  await page.goto("/producto/mono-verde");
  const saved = page.waitForResponse((r) => r.url().includes("/cart/items") && r.ok());
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await saved;
  await page.evaluate(() => localStorage.clear());
  await page.goto("/checkout");
  await expect(page.locator(".s-item")).toContainText("Moño Verde Largo");
  // limpia: saca el moño
  await page.getByRole("button", { name: "Abrir bolsa" }).click();
  await page.locator("#drawer").getByRole("button", { name: "Quitar" }).click();
  await expect(page.locator("#drawer")).toContainText("Tu bolsa está vacía");
  await context.clearCookies();
});
