import { ADMIN, buyBow, expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";

test("reintegro desde el panel: el total por Mercado Pago, las prendas vuelven al stock y le llega un mail", async ({
  page,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  test.slow();

  const email = `e2e-reintegro-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  const number = await buyBow(page, email);
  const search = await request.get(`${MAILPIT}/search?query=to:${email}`).catch(() => null);

  await page.goto(`/taller/pedidos?pedido=${number}`);
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });

  // reintegro desde el detalle: el total por Mercado Pago, las prendas (sin retirar) vuelven al stock
  await drawer.getByRole("button", { name: "Reintegrar el pago" }).click();
  const refund = drawer.getByRole("region", { name: "Reintegrar el pago" });
  await expect(refund).toContainText("por Mercado Pago, al mismo medio con el que pagó");
  await expect(refund.getByRole("checkbox", { name: /Las prendas vuelven al stock/ })).toBeChecked();
  await refund.getByLabel("Motivo del reintegro").fill("no le quedó");
  await refund.getByRole("button", { name: /^Reintegrar \$/ }).click();
  await expect(drawer.locator(".drawer-head .pill-status")).toHaveText("Reembolsado");
  await expect(drawer.locator(".tl")).toContainText("Pago reintegrado");
  await expect(drawer.locator(".tl")).toContainText("prendas al stock");
  await expect(drawer.getByRole("button", { name: "Reintegrar el pago" })).toHaveCount(0);
  if (search?.ok())
    await expect
      .poll(async () => {
        const r = await (await request.get(`${MAILPIT}/search?query=to:${email}`)).json();
        return (r.messages ?? []).map((m: { Subject: string }) => m.Subject).join(" | ");
      })
      .toContain(`Te devolvimos el dinero del pedido #${number}`);
});
