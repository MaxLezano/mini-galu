import type { APIRequestContext } from "@playwright/test";
import { ADMIN, buyBow, expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";

/** Adjuntos de los mails que le llegaron a `to`, por asunto ("" si Mailpit no está). */
async function attachmentsBySubject(request: APIRequestContext, to: string): Promise<Record<string, string[]>> {
  const r = await (await request.get(`${MAILPIT}/search?query=to:${to}`)).json();
  const out: Record<string, string[]> = {};
  for (const m of (r.messages ?? []) as { ID: string; Subject: string }[]) {
    const full = await (await request.get(`${MAILPIT}/message/${m.ID}`)).json();
    out[m.Subject] = ((full.Attachments ?? []) as { FileName: string }[]).map((a) => a.FileName);
  }
  return out;
}

test("factura C al pagar (adjunta al mail y en el detalle del pedido) y nota de crédito al reintegrar", async ({
  page,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  test.slow();

  const email = `e2e-factura-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  const number = await buyBow(page, email);
  const mailpit = (await request.get(`${MAILPIT}/info`).catch(() => null))?.ok();

  // la factura viaja adjunta al "Recibimos tu pago"
  if (mailpit)
    await expect
      .poll(async () => (await attachmentsBySubject(request, email))[`Recibimos tu pago · Pedido #${number}`] ?? [])
      .toEqual([expect.stringMatching(/^factura-C-\d{5}-\d{8}\.pdf$/)]);

  await page.goto(`/taller/pedidos?pedido=${number}`);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });

  // emitida, con CAE y el PDF (simulada en local y CI)
  const factura = drawer.locator(".od-sec", { has: page.getByRole("heading", { name: "Factura", exact: true }) });
  await expect(factura).toContainText(/Factura C\s*\d{5}-\d{8}/);
  await expect(factura).toContainText("Emitida");
  await expect(factura).toContainText(/CAE \d{14}/);
  await expect(drawer.locator(".tl")).toContainText(/Factura C \d{5}-\d{8} emitida/);
  const pdfHref = await factura.getByRole("link", { name: "Ver PDF" }).getAttribute("href");
  const pdf = await page.request.get(pdfHref ?? "");
  expect(pdf.headers()["content-type"]).toBe("application/pdf");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

  // reintegro: la factura se anula con una nota de crédito, que va adjunta al aviso
  await drawer.getByRole("button", { name: "Reintegrar el pago" }).click();
  await drawer
    .getByRole("region", { name: "Reintegrar el pago" })
    .getByRole("button", { name: /^Reintegrar \$/ })
    .click();
  await expect(drawer.locator(".drawer-head .pill-status")).toHaveText("Reembolsado");
  await expect(factura).toContainText(/Nota de crédito C\s*\d{5}-\d{8}/);
  await expect(factura.getByRole("link", { name: "Ver PDF" })).toHaveCount(2);
  if (mailpit)
    await expect
      .poll(
        async () => (await attachmentsBySubject(request, email))[`Te devolvimos el dinero del pedido #${number}`] ?? [],
      )
      .toEqual([expect.stringMatching(/^nota-de-credito-C-\d{5}-\d{8}\.pdf$/)]);
});
