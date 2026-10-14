import { expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";

test("cartas del taller: sumarse desde el pie y darse de baja con el link del mail", async ({ page, request }) => {
  const email = `carta-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/");
  const footer = page.getByRole("contentinfo");
  await footer.locator(".nl-form").getByRole("textbox", { name: "Email" }).fill(email);
  await footer.getByRole("button", { name: "Sumarme" }).click();
  await expect(footer).toContainText("¡Gracias! Te escribimos pronto.");

  // el link de baja viene en el mail de bienvenida (Mailpit en local; en CI no hay servidor de mails)
  const search = await request.get(`${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}`).catch(() => null);
  test.skip(!search?.ok(), "Sin Mailpit no se puede leer el mail de bienvenida");
  let id: string | undefined;
  await expect
    .poll(async () => {
      const r = await (await request.get(`${MAILPIT}/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
      id = r.messages?.[0]?.ID;
      return id;
    })
    .toBeTruthy();
  const msg = await (await request.get(`${MAILPIT}/message/${id}`)).json();
  expect(msg.Subject).toBe("Te sumaste a las Cartas del taller ♡");
  const link = /https?:\/\/[^"\s]+\/cartas\/baja\?t=[\w-]+/.exec(msg.Text)?.[0];
  expect(link).toBeTruthy();

  await page.goto(new URL(link ?? "").pathname + new URL(link ?? "").search);
  await page.getByRole("button", { name: "Sí, darme de baja" }).click();
  await expect(page.getByText("Listo, no te escribimos más")).toBeVisible();
});
