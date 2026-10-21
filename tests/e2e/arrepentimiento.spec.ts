import { ADMIN, buyBow, expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";

test("botón de arrepentimiento: visible arriba, da un código, lo manda por mail y el taller lo ve", async ({
  page,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  test.slow();

  // Res. SCI 424/2020: en la primera pantalla del inicio, sin abrir nada
  await page.goto("/");
  const link = page.locator(".announce").getByRole("link", { name: "Botón de arrepentimiento" });
  await expect(link).toBeInViewport();
  await link.click();
  await expect(page.getByRole("heading", { name: "Botón de arrepentimiento" })).toBeVisible();

  const email = `e2e-baja-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  const number = await buyBow(page, email);

  await page.goto(`/arrepentimiento?pedido=${number}`);
  const form = page.locator(".rv-card");
  await expect(form.getByLabel("Número de pedido")).toHaveValue(number);
  // con otro mail no se puede pedir la baja (ni saber de quién es el pedido)
  await form.getByLabel("Mail con el que compraste").fill("otra@ejemplo.com");
  await page.getByRole("button", { name: "Pedir la baja" }).click();
  await expect(page.locator(".rv-error")).toContainText("No encontramos un pedido con ese número y ese mail");

  await form.getByLabel("Mail con el que compraste").fill(email);
  await form.getByLabel(/Motivo/).fill("Me equivoqué de color");
  await page.getByRole("button", { name: "Pedir la baja" }).click();
  await expect(page.getByText("Solicitud registrada")).toBeVisible();
  const code = (await page.getByTestId("revocation-code").textContent())?.trim() ?? "";
  expect(code).toMatch(/^ARR-[A-Z0-9]{6}$/);

  // si la vuelve a pedir, mismo código
  await page.goto(`/arrepentimiento?pedido=${number}`);
  await form.getByLabel("Mail con el que compraste").fill(email);
  await page.getByRole("button", { name: "Pedir la baja" }).click();
  await expect(page.getByText("Ya la habías pedido")).toBeVisible();
  await expect(page.getByTestId("revocation-code")).toHaveText(code);

  // el código le llega por mail
  const search = await request.get(`${MAILPIT}/search?query=to:${email}`).catch(() => null);
  if (search?.ok())
    await expect
      .poll(async () => {
        const r = await (await request.get(`${MAILPIT}/search?query=to:${email}`)).json();
        return (r.messages ?? []).map((m: { Subject: string }) => m.Subject).join(" | ");
      })
      .toContain(code);

  // el taller lo ve en el pedido
  await page.goto(`/taller/pedidos?pedido=${number}`);
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });
  await expect(drawer.locator(".od-revocation")).toContainText(code);
  await expect(drawer.locator(".od-revocation")).toContainText("Me equivoqué de color");
});
