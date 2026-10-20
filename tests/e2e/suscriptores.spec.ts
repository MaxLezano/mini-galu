import { ADMIN, expect, test } from "./fixtures";

const API = "http://localhost:4000";

test("suscriptores: Gaby ve quién se sumó a las cartas y quién espera un talle", async ({ page, request }) => {
  const tag = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const carta = `carta-${tag}@ejemplo.com`;
  const talle = `talle-${tag}@ejemplo.com`;
  expect((await request.post(`${API}/newsletter`, { data: { email: carta, source: "footer" } })).ok()).toBe(true);
  const wait = await request.post(`${API}/catalog/waitlist`, {
    data: { slug: "romantico-rojo", size: "4", channel: "email", contact: talle },
  });
  expect(wait.ok()).toBe(true);

  await page.goto("/taller/suscriptores");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller\/suscriptores/);
  await expect(page.getByRole("heading", { name: "Suscriptores" })).toBeVisible();

  const search = page.getByRole("textbox", { name: "Buscar suscriptor" });
  await search.fill(carta);
  const row = page.getByRole("row").filter({ hasText: carta });
  await expect(row).toContainText("Pie de la tienda");
  await expect(row).toContainText("Suscripto");
  await expect(row.getByRole("link", { name: `Escribirle a ${carta}` })).toHaveAttribute("href", `mailto:${carta}`);

  await page.getByRole("button", { name: /^Aviso de talle/ }).click();
  await search.fill(talle);
  const alert = page.getByRole("row").filter({ hasText: talle });
  await expect(alert).toContainText("Set Romántico Rojo · T4");
  await expect(alert).toContainText("Esperando");
  await expect(alert).toContainText("Todavía no compró");

  // la búsqueda también encuentra por prenda
  await search.fill("romantico");
  await expect(page.getByRole("row").filter({ hasText: talle })).toBeVisible();
});
