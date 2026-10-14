import { expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";
const API = "http://localhost:4000";

/**
 * Gift card con el gateway simulado: se arma, se paga en el link de pago (APRO aprueba), el código llega por mail
 * (Mailpit en local) y con ese código se paga entero un pedido en el checkout.
 */
test("comprar una gift card, recibir el código y pagar un pedido con ella", async ({ page, request }) => {
  const config = await (await request.get(`${API}/checkout/config`)).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  const stamp = `${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  const buyer = `gc-compra-${stamp}@ejemplo.com`;
  const recipient = `gc-recibe-${stamp}@ejemplo.com`;

  await page.goto("/giftcards");
  const form = page.locator("#gb-form");
  await form.getByRole("button", { name: "$50.000" }).click();
  await form.getByLabel("Para", { exact: true }).fill("Olivia");
  await form.getByLabel("De parte de").fill("La tía Sole");
  await form.getByLabel("Mensaje").fill("¡Feliz cumple!");
  await form.getByRole("button", { name: "Email" }).click();
  await form.getByLabel("Mail de quien la recibe").fill(recipient);
  await form.getByLabel("Nombre", { exact: true }).fill("Sole");
  await form.getByLabel("Apellido").fill("Paz");
  await form.getByLabel("Tu mail").fill(buyer);
  await form.getByLabel("Tu celular").fill("11 5555-1234");
  await expect(page.locator(".gb-preview .gc")).toContainText("Para Olivia");
  await page.getByRole("button", { name: /Pagar con Mercado Pago/ }).click();

  await expect(page).toHaveURL(/\/pagar\/MG-\d+\?t=/);
  await expect(page.getByText("Tu gift card para Olivia está lista")).toBeVisible();
  await page.getByLabel("Nombre como figura").fill("APRO");
  await page.locator("#pay").click();
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  await expect(done).toContainText("La gift card para Olivia ya está activa");

  // el código llega por mail (Mailpit, en local y en el CI)
  const search = await request
    .get(`${MAILPIT}/search?query=${encodeURIComponent(`to:${recipient}`)}`)
    .catch(() => null);
  test.skip(!search?.ok(), "Sin Mailpit no se puede leer el código de la gift card");
  let text = "";
  await expect
    .poll(async () => {
      const r = await (await request.get(`${MAILPIT}/search?query=${encodeURIComponent(`to:${recipient}`)}`)).json();
      const id = r.messages?.[0]?.ID;
      if (id) text = (await (await request.get(`${MAILPIT}/message/${id}`)).json()).Text;
      return text;
    })
    .toContain("GALU-");
  const code = /GALU-[A-Z0-9]{4}-[A-Z0-9]{4}/.exec(text)?.[0] ?? "";

  // saldo
  await page.goto("/giftcards");
  await page.getByLabel("Código de la gift card").fill(code.toLowerCase());
  await page.getByRole("button", { name: "Consultar" }).click();
  await expect(page.locator(".bal-res")).toContainText("$50.000");

  // la usa en el checkout: cubre todo el moño y no hay que pagar nada más
  await page.goto("/producto/mono-verde");
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await page.locator("#drawer").getByRole("link", { name: "Ir a pagar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator(".s-item")).toContainText("Moño Verde Largo");
  const toggle = page.getByRole("button", { name: /Ver resumen/ });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByLabel("Código de gift card").fill(code);
  await page.getByLabel("Código de gift card").press("Enter");
  await expect(page.locator(".applied")).toContainText(code);
  await expect(page.locator(".totals .total")).toContainText("$0");

  const step = page.getByRole("region", { name: "Tus datos" });
  await step.getByLabel("Email").fill(recipient);
  await step.getByLabel("Nombre", { exact: true }).fill("Mamá");
  await step.getByLabel("Apellido").fill("De Olivia");
  await step.getByLabel("Celular").fill("11 4444-5555");
  await step.getByRole("button", { name: /Continuar al envío/ }).click();
  await page.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await page.locator(".slots .chip").first().click();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await expect(page.getByRole("dialog", { name: "Pago aprobado" })).toContainText("Gift card");

  const balance = await (await request.get(`${API}/giftcards/${code}`)).json();
  expect(balance.balanceCents).toBeLessThan(50_000_00);
});
