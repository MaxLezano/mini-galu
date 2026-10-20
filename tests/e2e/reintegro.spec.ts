import type { Page } from "@playwright/test";
import { ADMIN, expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";

/** Compra pagada del moño (retiro en el taller, gateway simulado: APRO aprueba). Devuelve el número de pedido. */
async function buyBow(page: Page, email: string): Promise<string> {
  await page.goto("/producto/mono-verde");
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await page.locator("#drawer").getByRole("link", { name: "Ir a pagar" }).click();
  const step = page.getByRole("region", { name: "Tus datos" });
  await step.getByLabel("Email").fill(email);
  await step.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await step.getByLabel("Apellido").fill("Fernández");
  await step.getByLabel("Celular").fill("11 5555-1234");
  await step.getByRole("button", { name: /Continuar al envío/ }).click();
  await page.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await page.locator(".slots .chip").first().click();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await page.getByLabel("Nombre como figura").fill("APRO");
  await page.locator("#pay").click();
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  const number = /MG-\d+/.exec((await done.textContent()) ?? "")?.[0];
  expect(number).toBeTruthy();
  return number as string;
}

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
