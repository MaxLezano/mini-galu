import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";
const PASSWORD = "Clave.Segura1";

/** Último mail que le llegó a esa dirección en Mailpit (o null si no hay Mailpit, como en CI). */
async function lastMail(request: APIRequestContext, to: string, subject: string) {
  const ok = await request.get(`${MAILPIT}/messages?limit=1`).catch(() => null);
  if (!ok?.ok()) return null;
  let msg: { Text: string } | null = null;
  await expect
    .poll(async () => {
      const r = await (
        await request.get(`${MAILPIT}/search?query=${encodeURIComponent(`to:${to} subject:"${subject}"`)}`)
      ).json();
      const id = r.messages?.[0]?.ID;
      if (id) msg = await (await request.get(`${MAILPIT}/message/${id}`)).json();
      return !!id;
    })
    .toBe(true);
  return msg as { Text: string } | null;
}

test("cuenta: crear, sumar una nena, un favorito y una dirección; salir y recuperar la contraseña", async ({
  page,
  request,
}) => {
  const email = `cuenta-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/ingresar?crear");
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Prueba");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill("minuscula1");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page.locator(".auth-error")).toContainText("La contraseña necesita");
  await auth.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await expect(page.locator(".me")).toContainText("Lucía Prueba");

  // mis nenas
  await page.getByRole("button", { name: /Agregar nena/ }).click();
  const modal = page.getByRole("dialog", { name: "Agregar nena" });
  await modal.getByLabel("Nombre").fill("Olivia");
  await modal.getByLabel("Cumpleaños").fill("2021-11-14");
  await modal.getByLabel("Talle actual").selectOption("4");
  await modal.getByRole("button", { name: "Guardar" }).click();
  await expect(page.locator('[data-nena="Olivia"]')).toContainText("talle");
  await expect(page.locator('[data-nena="Olivia"]')).toContainText("14 de noviembre");

  // un favorito desde la ficha queda en la cuenta
  await page.goto("/producto/mono-verde");
  await page
    .getByRole("button", { name: /favoritos/i })
    .first()
    .click();
  await page.goto("/cuenta#favoritos");
  await expect(page.locator("#favs")).toContainText("Moño Verde Largo");

  // mis datos: dirección
  await page.goto("/cuenta#datos");
  await page.getByRole("button", { name: "Agregar dirección" }).click();
  const af = page.locator("form", { has: page.getByRole("button", { name: "Guardar dirección" }) });
  await af.getByLabel("Código postal").fill("1414");
  await af.getByLabel("Calle").fill("Gurruchaga");
  await af.getByLabel("Altura").fill("1234");
  await af.getByLabel("Localidad").fill("Palermo");
  await page.getByRole("button", { name: "Guardar dirección" }).click();
  await expect(page.locator(".addr")).toContainText("Casa · por defecto");

  // salir y volver: los favoritos siguen en la cuenta (otro navegador los vería igual)
  await page.getByRole("link", { name: "Salir" }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/ingresar");
  await auth.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "¿Te olvidaste la contraseña?" }).click();
  await expect(page.locator(".auth-ok")).toContainText(email);
  const mail = await lastMail(request, email, "Creá una contraseña nueva");
  test.skip(!mail, "Sin Mailpit no se puede leer el mail para recuperar la contraseña");
  const link = /https?:\/\/\S+reset-password\S+/.exec(mail?.Text ?? "")?.[0];
  expect(link).toBeTruthy();
  await page.goto(link ?? "");
  await expect(page).toHaveURL(/\/ingresar\/nueva-clave\?token=/);
  await auth.getByLabel("Contraseña nueva").fill("Otra.Clave2");
  await auth.getByLabel("Repetila").fill("Otra.Clave2");
  await page.getByRole("button", { name: "Guardar contraseña" }).click();
  await expect(page.locator(".auth-ok")).toContainText("ya podés ingresar");
  await page.getByRole("link", { name: "Ingresar" }).last().click();
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill("Otra.Clave2");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await page.goto("/cuenta#favoritos");
  await expect(page.locator("#favs")).toContainText("Moño Verde Largo");
});

test("lista de cumple: se arma desde la prenda, la familia la abre sin cuenta y lo regalado queda marcado", async ({
  page,
  browser,
  request,
}) => {
  // flujo largo (cuenta, lista, compra con otra sesión): en el CI pasa los 30 s por defecto
  test.setTimeout(60_000);
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  const email = `lista-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/ingresar?crear");
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Lista");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await page.getByRole("button", { name: /Agregar nena/ }).click();
  const modal = page.getByRole("dialog", { name: "Agregar nena" });
  await modal.getByLabel("Nombre").fill("Olivia");
  await modal.getByLabel("Cumpleaños").fill("2021-11-14");
  await modal.getByRole("button", { name: "Guardar" }).click();
  await expect(page.locator('[data-nena="Olivia"]')).toBeVisible();

  await page.goto("/producto/mono-verde");
  await page.getByRole("button", { name: "Sumar a una lista de cumple" }).click();
  await page
    .getByRole("dialog", { name: "Sumar a una lista de cumple" })
    .getByRole("button", { name: /Olivia/ })
    .click();
  await expect(page.locator("#toast")).toContainText("sumado a la lista de Olivia");

  await page.goto("/cuenta#lista");
  await expect(page.locator("#wish")).toContainText("Moño Verde Largo");
  const link = (await page.locator(".share-link span").textContent()) ?? "";
  const path = link.slice(link.indexOf("/lista/"));
  expect(path).toMatch(/^\/lista\/olivia-[a-f0-9]{4}$/);

  // la familia (otro navegador, sin cuenta) lo regala
  const fam = await (await browser.newContext()).newPage();
  await fam.goto(path);
  await expect(fam.getByRole("heading", { level: 1 })).toContainText("Olivia");
  await fam.locator('[data-wish="mono-verde"]').getByRole("button", { name: "Lo regalo yo" }).click();
  await fam.goto("/checkout");
  const step = fam.getByRole("region", { name: "Tus datos" });
  await step.getByLabel("Email").fill(`familia-${Date.now()}@ejemplo.com`);
  await step.getByLabel("Nombre", { exact: true }).fill("Marta");
  await step.getByLabel("Apellido").fill("Abuela");
  await step.getByLabel("Celular").fill("11 5555-1234");
  await step.getByRole("button", { name: /Continuar al envío/ }).click();
  await fam.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await fam.locator(".slots .chip").first().click();
  await fam.getByRole("button", { name: /Continuar al pago/ }).click();
  await fam.locator("#pay").click();
  await expect(fam.getByRole("dialog", { name: "Pago aprobado" })).toContainText("¡Gracias, Marta!");

  await fam.goto(path);
  await expect(fam.locator('[data-wish="mono-verde"]')).toContainText("Ya se lo regalaron");
  // la dueña lo ve regalado, pero no quién (hasta el cumple)
  await page.reload();
  await expect(page.locator("#wish")).toContainText("Regalado");
  await expect(page.locator("#wish")).not.toContainText("Marta");
});
