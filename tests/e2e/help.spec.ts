import { ADMIN, expect, test } from "./fixtures";

test("ayuda: del pie a términos y entre páginas, con el índice del tema", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "Términos" }).click();
  await expect(page).toHaveURL(/\/ayuda\/terminos$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Términos y condiciones");

  await page
    .getByRole("navigation", { name: "Páginas de ayuda" })
    .getByRole("link", { name: "Envíos y pagos" })
    .click();
  await expect(page).toHaveURL(/\/ayuda\/envios-y-pagos$/);
  await expect(page.locator(".lead")).toContainText(/Envío gratis desde \$\s?90\.000/);
  await expect(page.getByRole("heading", { name: "Medios de pago" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Preguntale a Galú" })).toBeVisible();

  const missing = await page.goto("/ayuda/no-existe");
  expect(missing?.status()).toBe(404);
});

test("ayuda: editar una página en el panel se ve en la tienda y vuelve al texto de base", async ({ page }, info) => {
  // cada proyecto (celular / escritorio) edita una página distinta: corren en paralelo sobre la misma base
  const [topic, tab] = info.project.name === "celular" ? ["terminos", "Términos"] : ["privacidad", "Privacidad"];
  page.on("dialog", (d) => d.accept());
  await page.goto("/taller/tienda");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller\/tienda/);
  await expect(page.locator("body.adm-body")).toBeAttached();

  const box = page.locator("#ayuda");
  await box.getByRole("button", { name: tab, exact: true }).click();
  await box.getByLabel("Bajada").fill("Prueba e2e de la bajada.");
  await box.getByLabel("Título del apartado 1").fill("Apartado e2e");
  await box.getByLabel("Texto del apartado 1").fill("Primer párrafo.\n\n- uno\n- dos");
  await box.getByRole("button", { name: "Guardar página" }).click();
  await expect(page.locator("#toast")).toContainText("Página guardada");
  await expect(box.locator(".pill-status")).toContainText("Editada el");

  const shop = await page.context().newPage();
  await shop.goto(`/ayuda/${topic}`);
  await expect(shop.locator(".lead")).toHaveText("Prueba e2e de la bajada.");
  const sec = shop.locator("#apartado-e2e");
  await expect(sec.locator("p")).toHaveText("Primer párrafo.");
  await expect(sec.locator("li")).toHaveText(["uno", "dos"]);

  await box.getByRole("button", { name: "Volver al texto de base" }).click();
  await expect(page.locator("#toast")).toContainText("Volvió el texto de base");
  await expect(box.locator(".pill-status")).toHaveText("Texto de base");
  await shop.reload();
  await expect(shop.locator("#apartado-e2e")).toHaveCount(0);
});
