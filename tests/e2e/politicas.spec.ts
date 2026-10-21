import { ADMIN, expect, panelReady, test } from "./fixtures";

const API = "http://localhost:4000";

test("entregas y cambios: lo que cambia Gaby en el panel se ve en la tienda", async ({ page }) => {
  const before = await (await page.request.get(`${API}/policies`)).json();

  await page.goto("/taller/tienda");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller\/tienda/);
  await panelReady(page);

  try {
    const box = page.locator("#entregas");
    await box.getByLabel("Días para cambiar el talle").fill("15");
    await box.getByLabel("Sábado").fill("de mañana");
    await box.getByRole("button", { name: "Guardar entregas y cambios" }).click();
    await expect(box.getByRole("alert")).toHaveText("Escribí las franjas así: 10 a 13, 16 a 19");
    await expect(box.getByLabel("Sábado")).toBeFocused();
    await box.getByLabel("Sábado").fill("10 a 13");

    await box.getByLabel("Retiro en el taller").uncheck();
    await expect(box.getByLabel("Sábado")).toHaveCount(0);
    await box.getByLabel("Envío gratis desde un monto").uncheck();
    await box.getByLabel("Acordar envío por WhatsApp").uncheck();
    await box.getByRole("button", { name: "Guardar entregas y cambios" }).click();
    await expect(page.locator("#toast")).toContainText("Entregas y cambios guardados");

    const shop = await page.context().newPage();
    await shop.goto("/producto/mono-verde");
    await expect(shop.locator(".trust")).toContainText("15 días para cambiar talle");
    await shop.getByLabel("Código postal").fill("1414");
    await shop.getByRole("button", { name: "Calcular" }).click();
    await expect(shop.locator(".ship-res")).toContainText("Andreani a domicilio");
    await expect(shop.locator(".ship-res")).not.toContainText("Retiro en el taller");
    await expect(shop.locator(".ship-res")).not.toContainText("Acordar envío");

    await shop.goto("/ayuda/envios-y-pagos");
    await expect(shop.locator(".lead")).not.toContainText("Envío gratis");
    await expect(shop.locator(".lead")).not.toContainText("taller");
    await shop.goto("/ayuda/cambios");
    await expect(shop.locator(".lead")).toContainText("15 días");
  } finally {
    // vuelve a lo que había, aunque falle: los otros e2e compran con retiro en el taller
    const r = await page.request.put(`${API}/admin/policies`, {
      data: before,
      headers: { origin: "http://localhost:3000" },
    });
    expect(r.ok()).toBe(true);
  }
});
