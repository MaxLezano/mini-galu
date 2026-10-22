import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

/**
 * Checkout con el gateway simulado (sin credenciales de Mercado Pago): el titular decide el resultado como en las
 * tarjetas de prueba de MP. Se compra el moño (talle único, el que más stock tiene en el seed): una unidad por test.
 */
async function addBow(page: Page) {
  await page.goto("/producto/mono-verde");
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await expect(page.locator("#drawer .line-item")).toContainText("Moño Verde Largo");
  await page.locator("#drawer").getByRole("link", { name: "Ir a pagar" }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page, email: string) {
  const step = page.getByRole("region", { name: "Tus datos" });
  await step.getByLabel("Email").fill(email);
  await step.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await step.getByLabel("Apellido").fill("Fernández");
  await step.getByLabel("Celular").fill("11 5555-1234");
  await step.getByRole("button", { name: /Continuar al envío/ }).click();
}

/** En celular el resumen (con el cupón) viene plegado. */
async function openSummary(page: Page) {
  const toggle = page.getByRole("button", { name: /Ver resumen/ });
  if (await toggle.isVisible()) await toggle.click();
}

/** Con credenciales de Mercado Pago en el .env la API usa el Brick real: estos flujos son del gateway simulado. */
async function skipIfRealMercadoPago(request: APIRequestContext) {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
}

const MAILPIT = "http://localhost:8025/api/v1";

/** Sin credenciales de Meta, lo que sale por WhatsApp llega a Mailpit a "<número>@whatsapp.simulado". */
async function simulatedWhatsApp(request: APIRequestContext, number: string) {
  const up = await request.get(`${MAILPIT}/messages?limit=1`).catch(() => null);
  if (!up?.ok()) return null;
  const query = `to:5491155551234@whatsapp.simulado subject:"pedido #${number}"`;
  let text = "";
  await expect
    .poll(async () => {
      const r = await (await request.get(`${MAILPIT}/search?query=${encodeURIComponent(query)}`)).json();
      const id = r.messages?.[0]?.ID;
      if (id) text = (await (await request.get(`${MAILPIT}/message/${id}`)).json()).Text;
      return !!id;
    })
    .toBe(true);
  return text;
}

const uniqueEmail = () => `e2e-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;

test("compra como invitada con retiro en el taller: rechazo y reintento aprobado", async ({ page, request }) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());

  // valida antes de seguir
  await page.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await expect(page.locator(".field-error")).toContainText("retirar");
  await page.locator(".slots .chip").first().click();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();

  await expect(page.getByText("Te guardamos las prendas 30 minutos")).toBeVisible();
  await page.getByLabel("Nombre como figura").fill("OTHE");
  await page.locator("#pay").click();
  await expect(page.locator(".pay-error")).toContainText("rechazado");

  await page.getByLabel("Nombre como figura").fill("APRO");
  await page.locator("#pay").click();
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  await expect(done).toContainText("¡Gracias, Lucía!");
  await expect(done).toContainText(/Pedido #MG-\d+/);
  await expect(done).toContainText("San Miguel de Tucumán");

  // "Seguir mi pedido" lleva el token: el seguimiento muestra el total (sin el token, no)
  const follow = done.getByRole("link", { name: /Seguir mi pedido/ });
  await expect(follow).toHaveAttribute("href", /\/seguimiento\?pedido=MG-\d+&t=.+/);
  const href = (await follow.getAttribute("href")) ?? "";
  await page.goto(href);
  await expect(page.locator(".tr-card")).toContainText(/pagado el .+ · \$/);
  // el aviso del pago también salió por WhatsApp (simulado) y, con el link, se puede apagar
  const number = /pedido=(MG-\d+)/.exec(href)?.[1] ?? "";
  const wa = await simulatedWhatsApp(request, number);
  if (wa !== null) expect(wa).toContain(`Recibimos el pago de tu pedido #${number}`);
  const notices = page.getByRole("checkbox", { name: "Avisos por WhatsApp" });
  await expect(notices).toBeChecked();
  await notices.uncheck();
  await expect(page.getByText("los avisos te llegan solo por mail")).toBeVisible();
  await page.reload();
  await expect(notices).not.toBeChecked();
  await page.goto(href.replace(/&t=.*/, ""));
  await expect(page.locator(".tr-card")).toContainText("Pedido #MG-");
  await expect(page.locator(".tr-card .tr-top")).not.toContainText("$");
  // sin el token, el interruptor no está
  await expect(notices).toHaveCount(0);

  // la bolsa quedó vacía
  await page.goto("/checkout");
  await expect(page.getByText("Tu bolsa está vacía").first()).toBeVisible();
});

test("cupón de primera compra y pago con dinero en cuenta", async ({ page, request }) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());

  await openSummary(page);
  const coupon = page.getByLabel("Cupón de descuento");
  await coupon.fill("NOEXISTE");
  await page.locator("form.coupon").first().getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator("#coupon-error")).toContainText("no existe");
  await coupon.fill("bienvenida10");
  await page.locator("form.coupon").first().getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator(".applied")).toContainText("BIENVENIDA10 · 10%");

  const ship = page.getByRole("region", { name: "Envío" });
  await ship.getByLabel("Código postal", { exact: true }).fill("5000");
  await ship.getByRole("radio", { name: /Envío a domicilio/ }).check();
  await ship.getByLabel("Calle").fill("Duarte Quirós");
  await ship.getByLabel("Altura").fill("1200");
  await ship.getByLabel("Localidad").fill("Córdoba");
  await ship.getByLabel("Provincia").selectOption("Córdoba");
  await page.getByRole("button", { name: /Continuar al pago/ }).click();

  await page.getByRole("radio", { name: /Dinero en cuenta/ }).check();
  await page.locator("#pay").click();
  // simula la ida y vuelta a Mercado Pago
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  await expect(done).toContainText("Dinero en cuenta MP");
  await expect(done).toContainText("Llega a tu casa");
});

test("acordar envío por WhatsApp y cadete en la ciudad del taller: no se cobra el envío en la web", async ({
  page,
  request,
}) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());

  const ship = page.getByRole("region", { name: "Envío" });
  // en la ciudad del taller (CP 4000) también está el cadete, desde $3.000
  await ship.getByLabel("Código postal", { exact: true }).fill("4000");
  await expect(page.locator("label.option", { hasText: "Cadete en" })).toContainText("Desde $3.000");
  await ship.getByRole("radio", { name: /Acordar envío/ }).check();
  await expect(page.locator("label.option", { hasText: "Acordar envío" })).toContainText("A coordinar");
  await ship.getByLabel("Calle").fill("Laprida");
  await ship.getByLabel("Altura").fill("580");
  await ship.getByLabel("Localidad").fill("San Miguel de Tucumán");
  await ship.getByLabel("Provincia").selectOption("Tucumán");
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await openSummary(page);
  await expect(page.locator(".summary")).toContainText("A coordinar por WhatsApp");

  await page.getByLabel("Nombre como figura").fill("APRO");
  await page.locator("#pay").click();
  const done = page.getByRole("dialog", { name: "Pago aprobado" });
  await expect(done).toContainText("acordar cómo y por dónde lo mandamos");
});

test("la bolsa se guarda en el servidor y sobrevive a borrar el navegador", async ({ page, context }) => {
  await page.goto("/producto/mono-verde");
  const saved = page.waitForResponse((r) => r.url().includes("/cart/items") && r.ok());
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await saved;
  await page.evaluate(() => localStorage.clear());
  await page.goto("/checkout");
  await expect(page.locator(".s-item")).toContainText("Moño Verde Largo");
  // limpia: saca el moño
  await page.getByRole("button", { name: "Abrir bolsa" }).click();
  await page.locator("#drawer").getByRole("button", { name: "Quitar" }).click();
  await expect(page.locator("#drawer")).toContainText("Tu bolsa está vacía");
  await context.clearCookies();
});

test("aplicar un cupón en el paso de pago no borra lo que se cargó de la tarjeta", async ({ page, request }) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());
  await page.getByRole("radio", { name: /Retiro en el taller/ }).check();
  await page.locator(".slots .chip").first().click();
  await page.getByRole("button", { name: /Continuar al pago/ }).click();

  const holder = page.getByLabel("Nombre como figura");
  await holder.fill("Lucía Fernández");
  const before = await page.locator(".totals .total").textContent();
  await openSummary(page);
  await page.getByLabel("Cupón de descuento").fill("BIENVENIDA10");
  await page.locator("form.coupon").first().getByRole("button", { name: "Aplicar" }).click();
  await expect(page.locator(".applied")).toContainText("BIENVENIDA10");
  await expect(page.locator(".totals .total")).not.toHaveText(before ?? "");
  await expect(holder).toHaveValue("Lucía Fernández");
});

test("retiro en sucursal Andreani: se elige la sucursal del código postal", async ({ page, request }) => {
  await skipIfRealMercadoPago(request);
  await addBow(page);
  await fillContact(page, uniqueEmail());
  await page.getByRole("textbox", { name: "Código postal" }).fill("1414");
  const option = page.getByRole("radio", { name: /Retiro en sucursal/ });
  await option.check();
  // la opción muestra la sucursal que atiende el CP (como el mockup) y se puede elegir otra
  await expect(page.locator("label.option").filter({ has: option })).toContainText("Sucursal Palermo");
  const select = page.getByLabel("¿En qué sucursal lo retirás?");
  await expect(select).toHaveValue("10010");
  expect(await select.locator("option").count()).toBeGreaterThan(1);
  // en el mapa: tocar otra sucursal la elige, y volver a la del CP también
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  await expect(
    page.getByRole("button", { name: "Sucursal Palermo (Av Scalabrini Ortiz) (la de tu código postal)" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: /^Sucursal Caballito .*\(a [\d,]+ km\)$/ }).click();
  await expect(select.locator("option:checked")).toContainText(/^Caballito .* · a [\d,]+ km$/);
  await page.getByRole("button", { name: /^Sucursal Palermo/ }).click();
  await expect(select).toHaveValue("10010");
  await page.getByRole("button", { name: /Continuar al pago/ }).click();
  await expect(page.getByRole("region", { name: "Envío" })).toContainText("Andreani a sucursal · Palermo");
  await page.locator("#pay").click();
  await expect(page.getByRole("dialog", { name: "Pago aprobado" })).toContainText("Lo retirás en la sucursal Palermo");
});

test("bolsa abandonada: el link del recordatorio lleva a ingresar y de ahí al checkout con la bolsa de la cuenta", async ({
  page,
  context,
}) => {
  const email = `bolsa-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/ingresar?crear");
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Prueba");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill("Clave.Segura1");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await page.goto("/producto/mono-verde");
  const saved = page.waitForResponse((r) => r.url().includes("/cart/items") && r.ok());
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  await saved;
  await page.evaluate(() => localStorage.clear());

  // el link del mail (con sesión pasa directo)
  await page.goto("/ingresar?volver=%2Fcheckout");
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.locator(".s-item")).toContainText("Moño Verde Largo");
  await context.clearCookies();
});

test("checkout como invitada: ingresar desde 'Tus datos' vuelve al checkout con la bolsa y los datos de la cuenta", async ({
  page,
  context,
}) => {
  const email = `datos-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  await page.goto("/ingresar?crear");
  const auth = page.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Guardada");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill("Clave.Segura1");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/\/cuenta/);
  await context.clearCookies();

  // sin sesión: la bolsa es de invitada
  await addBow(page);
  const step = page.getByRole("region", { name: "Tus datos" });
  await expect(step.getByLabel("Email")).toHaveValue("");
  await step.getByRole("link", { name: "Ingresá" }).click();
  await expect(page).toHaveURL(/\/ingresar/);
  await page.locator("main.auth").getByLabel("Email").fill(email);
  await page.locator("main.auth").getByLabel("Contraseña", { exact: true }).fill("Clave.Segura1");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(step.getByLabel("Email")).toHaveValue(email);
  await expect(step.getByLabel("Apellido")).toHaveValue("Guardada");
  await expect(step.getByRole("link", { name: "Ingresá" })).toHaveCount(0);
  await expect(page.locator(".s-item")).toContainText("Moño Verde Largo");
  await context.clearCookies();
});
