import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures";

const MAILPIT = "http://localhost:8025/api/v1";
const PASSWORD = "Clave.Segura1";

/** Último mail que le llegó a esa dirección en Mailpit (o null si no hay Mailpit corriendo). */
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
  // flujo largo (y con el mail de recuperación por Mailpit): en el CI pasa los 30 s por defecto
  test.setTimeout(60_000);
  const email = `cuenta-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/ingresar?crear");
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Prueba");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill("minuscula1");
  // Ley 25.326: las Cartas del taller piden consentimiento expreso, la casilla arranca desmarcada
  await expect(auth.getByLabel(/Cartas del taller/)).not.toBeChecked();
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

  // menú de cuenta del header (en escritorio; en el celular la cuenta va por el menú lateral)
  if (test.info().project.name === "escritorio") {
    await page.getByRole("button", { name: "Mi cuenta" }).click();
    const menu = page.locator("#pop-user");
    await expect(menu).toContainText("Hola, Lucía");
    await expect(menu).toContainText("Olivia (talle 4)");
    await menu.getByRole("link", { name: "Mis datos" }).click();
    await expect(page).toHaveURL(/\/cuenta#datos$/);
    await expect(page.getByRole("button", { name: "Agregar dirección" })).toBeVisible();
    await expect(menu).toBeHidden();
  }

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
  await expect(page.getByLabel(/Recibir las Cartas del taller/)).not.toBeChecked();
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

test("adelanto de un lanzamiento: el favorito pide cuenta y queda guardado en ella", async ({ page }) => {
  // corazon-pana es un borrador del seed: se ve por link como adelanto
  await page.goto("/producto/corazon-pana");
  await expect(page.locator(".soon-box")).toBeVisible();
  await page.locator(".soon-box").getByRole("button", { name: "Guardar en favoritos" }).click();
  await expect(page).toHaveURL(/\/ingresar\?volver=%2Fproducto%2Fcorazon-pana/);

  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Ana");
  await auth.getByLabel("Apellido").fill("Adelanto");
  await auth.getByLabel("Email").fill(`adelanto-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`);
  await auth.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/producto\/corazon-pana$/);

  const fav = page.locator(".soon-box").getByRole("button", { name: "Guardar en favoritos" });
  await fav.click();
  await expect(fav).toHaveAttribute("aria-pressed", "true");
  // queda en la cuenta (el taller lo cuenta); en "Mi cuenta" se lista recién cuando sale
  await expect
    .poll(async () => (await (await page.request.get("http://localhost:4000/me")).json()).favorites)
    .toContain("corazon-pana");
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

test("catálogo con cuenta: filtrar por el talle de la nena y armar su lista eligiendo varias prendas", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const email = `elegir-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/ingresar?crear");
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Paula");
  await auth.getByLabel("Apellido").fill("Elige");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await page.getByRole("button", { name: /Agregar nena/ }).click();
  const modal = page.getByRole("dialog", { name: "Agregar nena" });
  await modal.getByLabel("Nombre").fill("Emma");
  await modal.getByLabel("Talle actual").selectOption("6");
  await modal.getByRole("button", { name: "Guardar" }).click();
  await expect(page.locator('[data-nena="Emma"]')).toBeVisible();

  // "Para mis nenas": un toque filtra por su talle
  await page.goto("/catalogo");
  const filters = page.getByRole("complementary", { name: "Filtros" });
  await expect(page.locator(".filters .nena", { hasText: "Emma" })).toHaveCount(1); // las nenas llegan después de montar
  if (await page.locator(".filters-btn").isVisible()) await page.locator(".filters-btn").click(); // celular: hoja
  await filters.getByRole("button", { name: /Emma/ }).click();
  await expect(page).toHaveURL(/talle=6/);
  await expect(filters.getByRole("button", { name: /Emma/ })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/cuenta#lista");
  await page.getByRole("link", { name: "Agregar prendas" }).click();

  // modo lista: se tocan las prendas y se suman juntas
  await expect(page).toHaveURL(/lista=emma-/);
  await expect(page.locator(".pick-head")).toContainText("Armando la lista de cumple de Emma");
  await page.locator(".p-card", { hasText: "Vestido Cleo" }).locator(".p-media").click();
  await page.getByRole("button", { name: "Elegir Set Maddie Bordado" }).click();
  await expect(page.locator(".pick-bar")).toContainText("2 prendas elegidas");
  await expect(page).toHaveURL(/\/catalogo/); // tocar la foto elige, no abre la ficha
  await page.getByRole("button", { name: "Agregar a la lista de Emma" }).click();
  await expect(page).toHaveURL(/\/cuenta\?nena=.+#lista/);
  await expect(page.locator("#toast")).toContainText("Sumamos 2 prendas a la lista de Emma");
  await expect(page.locator("#wish")).toContainText("Vestido Cleo");
  await expect(page.locator("#wish")).toContainText("Set Maddie Bordado");

  await page.getByRole("link", { name: "Agregar prendas" }).click();
  await expect(page.locator(".p-card", { hasText: "Vestido Cleo" })).toContainText("Ya está en la lista");
});

test("cumple: al cargar una nena con el cumple cerca le llega el mail con ideas en su talle", async ({ request }) => {
  const email = `cumple-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  const api = "http://localhost:4000";
  const headers = { origin: "http://localhost:3000" };
  const signUp = await request.post(`${api}/auth/sign-up/email`, {
    headers,
    data: { email, password: PASSWORD, name: "Ana Prueba", firstName: "Ana", lastName: "Prueba" },
  });
  expect(signUp.ok()).toBe(true);
  const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(5, 10);
  const child = await request.post(`${api}/me/children`, {
    headers,
    data: { name: "Olivia", birthday: `2021-${soon}`, size: "6", heightCm: null },
  });
  expect(child.ok()).toBe(true);

  const mail = await lastMail(request, email, "Se viene el cumple de Olivia");
  test.skip(!mail, "Sin Mailpit corriendo");
  expect(mail?.Text).toContain("Hola Ana! Se viene el cumple de Olivia. Te dejamos ideas en talle 6");
  expect(mail?.Text).toContain("/catalogo?talle=6");
  expect(mail?.Text).toMatch(/- .+ · \$[\d.]+: http:\/\/localhost:3000\/producto\//);
});
