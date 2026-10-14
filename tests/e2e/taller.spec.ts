import type { Page } from "@playwright/test";
import { ADMIN, expect, test } from "./fixtures";

/** El panel ya hidrató: AdminShell agrega `adm-body` en un efecto (corre cuando React terminó). */
async function ready(page: Page) {
  await expect(page.locator("body.adm-body")).toBeAttached();
}

async function login(page: Page) {
  await page.goto("/taller/productos");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  // vuelve a donde quería entrar
  await expect(page).toHaveURL(/\/taller\/productos/);
  await ready(page);
}

test("el panel pide ingresar y rechaza una contraseña incorrecta", async ({ page }) => {
  await page.goto("/taller/productos");
  await expect(page).toHaveURL(/\/taller\/ingresar\?volver=/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill("no-es-la-clave");
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page.locator(".auth-error")).toContainText("no coinciden");
});

test("entrar por /taller lleva al panel y salir vuelve a ingresar", async ({ page }) => {
  await page.goto("/taller");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller$/);
  await expect(page.getByRole("heading", { name: /Gaby/ })).toBeVisible();
  // en celular la salida está en el menú lateral
  const burger = page.getByRole("button", { name: "Abrir menú" });
  if (await burger.isVisible()) await burger.click();
  await page.getByRole("button", { name: "Salir del panel" }).click();
  await expect(page).toHaveURL(/\/taller\/ingresar/);
  await page.goto("/taller/productos");
  await expect(page).toHaveURL(/\/taller\/ingresar/);
});

test("cargar stock en el panel se ve en la tienda", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();

  // Jumper Mariel: talle 4 tiene 1 → lo sube a 3
  await page.getByRole("button", { name: "Editar Jumper Mariel Bordado" }).first().click();
  const editor = page.getByRole("complementary", { name: "Editar producto" });
  await expect(editor).toHaveAttribute("aria-hidden", "false");
  const stock = editor.getByLabel("Stock talle 4");
  await stock.fill("3");
  await editor.getByRole("button", { name: "Guardar y publicar" }).click();
  await expect(page.locator("#toast")).toContainText("guardado y publicado");

  const shop = await page.context().newPage();
  await shop.goto("/producto/mariel");
  await expect(shop.getByRole("radio", { name: /Talle 4, 3 en stock/ })).toBeVisible();

  // vuelve al valor original
  await page.getByRole("button", { name: "Editar Jumper Mariel Bordado" }).first().click();
  await editor.getByLabel("Stock talle 4").fill("1");
  await editor.getByRole("button", { name: "Guardar y publicar" }).click();
  await expect(page.locator("#toast")).toContainText("guardado y publicado");
});

test("ocultar un producto lo saca del catálogo", async ({ page }) => {
  await login(page);
  const toggle = page.getByLabel("Publicado: Vestido Elsa");
  await toggle.uncheck();
  await expect(page.locator("#toast")).toContainText("oculto de la tienda");
  const shop = await page.context().newPage();
  await shop.goto("/catalogo?instock=0");
  await expect(shop.locator(".grid .p-name", { hasText: "Vestido Elsa" })).toHaveCount(0);
  await toggle.check();
  await expect(page.locator("#toast")).toContainText("publicado");
});

test("editar la portada se ve en la home", async ({ page }) => {
  await login(page);
  await page.goto("/taller/tienda");
  await ready(page);
  const eyebrow = page.getByLabel("Etiqueta");
  const original = await eyebrow.inputValue();
  await eyebrow.fill("Prueba e2e");
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await expect(page.locator("#toast")).toContainText("Portada publicada");

  const shop = await page.context().newPage();
  await shop.goto("/");
  await expect(shop.locator(".hero .eyebrow")).toHaveText("Prueba e2e");

  await eyebrow.fill(original);
  await page.getByRole("button", { name: "Guardar portada" }).click();
  await expect(page.locator("#toast")).toContainText("Portada publicada");
});

test("crear un lanzamiento como borrador y borrarlo", async ({ page }) => {
  await login(page);
  await page.goto("/taller/lanzamientos");
  await ready(page);
  await page.getByRole("button", { name: "Nuevo lanzamiento" }).click();
  const modal = page.getByRole("dialog", { name: "Lanzamiento" });
  await modal.getByLabel("Nombre").fill("Prueba e2e 99");
  await modal.getByLabel("Adelanto").fill("Un lanzamiento de prueba.");
  await modal.getByRole("button", { name: "Guardar como borrador" }).click();
  await expect(page.locator("#toast")).toContainText("borrador");
  const card = page.locator(".ln", { hasText: "Prueba e2e" });
  await expect(card).toContainText("Borrador");

  // programarlo sin prendas no se puede: abre el editor con el motivo
  await card.getByRole("button", { name: "Programar" }).click();
  await expect(page.locator("#toast")).toContainText("Elegí al menos una prenda");
  await page.keyboard.press("Escape");

  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: /Borrar/ }).click();
  await expect(page.locator(".ln", { hasText: "Prueba e2e" })).toHaveCount(0);
});

test("cupones: crear, pausar y borrar desde Tienda y pagos", async ({ page }) => {
  await login(page);
  await page.goto("/taller/tienda");
  await ready(page);
  // el modo depende de las credenciales del .env (simulado en CI, prueba en local)
  await expect(page.locator("#pagos")).toContainText(/Simulado|Prueba|Activa/);

  const code = `E2E${Date.now() % 1_000_000}`;
  await page.getByRole("button", { name: "+ Nuevo cupón" }).click();
  const modal = page.getByRole("dialog", { name: "Cupón" });
  await modal.getByLabel("Código").fill(code.toLowerCase());
  await modal.getByRole("button", { name: "Monto fijo" }).click();
  await modal.getByLabel("Valor").fill("5000");
  await modal.getByLabel("Compra mínima").fill("40000");
  await modal.getByRole("button", { name: "Crear cupón" }).click();
  await expect(page.locator("#toast")).toContainText(`Cupón ${code} creado`);

  const row = page.locator("#cp-rows tr", { hasText: code });
  await expect(row).toContainText("$5.000");
  await expect(row).toContainText("desde $40.000");
  await row.getByLabel(`${code} activo`).uncheck();
  await expect(page.locator("#toast")).toContainText("Cupón pausado");

  await row.click();
  page.once("dialog", (d) => d.accept());
  await modal.getByRole("button", { name: "Eliminar" }).click();
  await expect(page.locator("#toast")).toContainText(`${code} eliminado`);
  await expect(page.locator("#cp-rows tr", { hasText: code })).toHaveCount(0);
});

/** Un pedido pagado con el gateway simulado (sin credenciales de Mercado Pago). Devuelve su número. */
async function paidOrder(
  request: import("@playwright/test").APIRequestContext,
  shipping?: Record<string, string>,
): Promise<string | null> {
  const api = "http://localhost:4000";
  const config = await (await request.get(`${api}/checkout/config`)).json();
  if (config.gateway !== "simulado") return null;
  await request.post(`${api}/cart/items`, { data: { slug: "mono-verde", size: "Único", qty: 1 } });
  const slot = (await (await request.get(`${api}/checkout/shipping`)).json()).pickupSlots[0].id;
  const order = await (
    await request.post(`${api}/checkout/orders`, {
      data: {
        contact: {
          email: `e2e-${Date.now()}@ejemplo.com`,
          firstName: "Pedido",
          lastName: "Panel",
          phone: "11 5555-1234",
        },
        shipping: shipping ?? { method: "taller", pickupSlot: slot },
      },
    })
  ).json();
  await request.post(`${api}/checkout/orders/${order.number}/pay`, {
    data: {
      t: order.accessToken,
      card: {
        method: "debito",
        token: `sim-${Date.now()}`,
        paymentMethodId: "visa",
        installments: 1,
        payer: { email: "a@b.co" },
      },
    },
  });
  return order.number;
}

test("pedidos: preparar, cerrar la preparación tildando las prendas y anotar", async ({ page, request }) => {
  const number = await paidOrder(request);
  test.skip(!number, "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  await login(page);
  await page.goto("/taller/pedidos");
  await ready(page);
  // en celular arranca en lista; en escritorio, en tablero
  const card = page.locator(`[data-order="${number}"]`);
  await card.getByRole("button", { name: "Empezar a preparar" }).click();
  await expect(page.locator("#toast")).toContainText(`#${number} · Preparando`);

  await card.getByRole("button", { name: `Abrir pedido #${number}` }).click();
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });
  await expect(drawer).toContainText("Pago aprobado por Mercado Pago");
  await expect(drawer).toContainText("En preparación");
  await drawer.getByRole("button", { name: "Marcar listo para retirar" }).click();
  await expect(page.locator("#toast")).toContainText("Tildá todas las prendas");
  await drawer.getByLabel("Moño Verde Largo talle Único preparado").check();
  await drawer.getByRole("button", { name: "Marcar listo para retirar" }).click();
  await expect(drawer.locator(".pill-status").first()).toHaveText("Listo");

  await drawer.getByLabel("Notas internas").fill("Envolver con papel de seda");
  await drawer.getByLabel("Notas internas").blur();
  await expect(page.locator("#toast")).toContainText("Nota guardada");
  await drawer.getByRole("button", { name: "Cerrar" }).last().click();

  await page.getByRole("button", { name: "Lista", exact: true }).click();
  await page
    .locator(".status-chips")
    .getByRole("button", { name: /Listos para despachar/ })
    .click();
  await expect(page.locator(`#list`)).toContainText(`#${number}`);
});

test("resumen: el pedido pagado aparece para preparar, en los últimos y en lo que se hizo solo", async ({
  page,
  request,
}) => {
  const number = await paidOrder(request);
  test.skip(!number, "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  await login(page);
  await page.goto("/taller");
  await ready(page);
  await expect(page.locator("#todo .todo").first()).toContainText("pedidos para preparar");
  await expect(page.locator("#recent")).toContainText(`#${number} · Pedido Panel`);
  await expect(page.locator("#feed")).toContainText(`#${number}`);
  await page.getByRole("button", { name: "12 meses" }).click();
  await expect(page.getByRole("heading", { name: "Ventas por mes" })).toBeVisible();
  // del resumen se abre el detalle del pedido
  await page
    .locator("#recent")
    .getByRole("link", { name: new RegExp(`#${number}`) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/taller/pedidos\\?pedido=${number}`));
});

test("buscar un pedido desde la barra lo abre y la campana avisa el pedido nuevo", async ({ page, request }) => {
  const number = await paidOrder(request);
  test.skip(!number, "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  await login(page);
  await page.getByRole("button", { name: /Notificaciones \(\d+ sin leer\)/ }).click();
  await expect(page.locator("#notif")).toContainText(`Pedido nuevo #${number}`);
  await page.getByRole("button", { name: "Marcar como leídas" }).click();
  await expect(page.getByRole("button", { name: "Notificaciones", exact: true })).toBeVisible();

  await page.locator("#gsearch").fill(String(number).replace("MG-", ""));
  await page
    .locator("#search-pop")
    .getByRole("button", { name: new RegExp(`#${number}`) })
    .click();
  await expect(page).toHaveURL(new RegExp(`/taller/pedidos\\?pedido=${number}`));
  await expect(page.locator("#od.is-open")).toContainText(`#${number}`);
});

test("link de pago: se arma en el panel, el cliente paga en la tienda y el pedido pasa a nuevo", async ({
  page,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  await login(page);
  await page.goto("/taller/pedidos");
  await ready(page);
  await page.getByRole("button", { name: "Link de pago" }).click();
  const modal = page.getByRole("dialog", { name: "Nuevo link de pago" });
  await modal.getByRole("button", { name: "Instagram" }).click();
  // sin prendas no deja crear
  await modal.getByRole("button", { name: "Crear link de pago" }).click();
  await expect(modal.locator(".field-error")).toContainText("Agregá al menos una prenda");

  await modal.getByLabel("Prenda").selectOption({ label: "Moño Verde Largo" });
  await modal.getByLabel("Talle").selectOption({ index: 1 });
  await modal.getByRole("button", { name: "Agregar" }).click();
  await modal.getByLabel("Nombre").fill("Paula");
  await modal.getByLabel("Apellido").fill("Benítez");
  await modal.getByLabel("Celular").fill("11 5555-1234");
  await modal.getByLabel("Email").fill(`link-${Date.now()}@ejemplo.com`);
  await modal.getByRole("group", { name: "Horario de retiro" }).getByRole("button").first().click();
  await modal.getByRole("button", { name: "Crear link de pago" }).click();

  const url = await modal.getByLabel("Link para pagar").inputValue();
  const number = /\/pagar\/(MG-\d+)/.exec(url)?.[1] ?? "";
  expect(number).not.toBe("");
  await modal.getByRole("button", { name: "Listo" }).click();
  // queda en "esperando pago" con canal Instagram
  await expect(page.locator(`[data-order="${number}"]`)).toBeVisible();

  await page.goto(url);
  await expect(page.getByRole("heading", { name: /Hola, Paula/ })).toBeVisible();
  await expect(page.locator(".summary")).toContainText("Moño Verde Largo");
  await page.locator("#pay").click();
  await expect(page.getByRole("dialog", { name: "Pago aprobado" })).toContainText("¡Gracias, Paula!");

  // el link ya no se puede volver a pagar
  await page.goto(url);
  await expect(page.getByText("Este pedido ya está pagado")).toBeVisible();
});

test("envío: etiqueta Andreani desde el panel y seguimiento público del pedido", async ({ page, request }) => {
  const number = await paidOrder(request, {
    method: "domicilio",
    postalCode: "1414",
    province: "CABA",
    street: "Gurruchaga",
    number: "1234",
    city: "Palermo",
  });
  test.skip(!number, "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  await login(page);
  await page.goto(`/taller/pedidos?pedido=${number}`);
  await ready(page);
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });
  await drawer.getByRole("button", { name: "Empezar a preparar" }).click();
  await drawer.getByLabel("Moño Verde Largo talle Único preparado").check();
  // la etiqueta se abre en otra pestaña (PDF)
  const [pdf] = await Promise.all([
    page.context().waitForEvent("page"),
    drawer.getByRole("button", { name: "Generar etiqueta Andreani" }).click(),
  ]);
  await expect(page.locator("#toast")).toContainText(`#${number} · Etiqueta Andreani generada`);
  await pdf.close();
  await expect(drawer.locator(".pill-status").first()).toHaveText("Listo");
  await expect(drawer).toContainText(/Nº 3\d{14}/);
  const label = await page.request.get(`http://localhost:4000/admin/orders/${number}/label`);
  expect(label.headers()["content-type"]).toBe("application/pdf");

  // seguimiento público (sin sesión): el recorrido y el número de Andreani, sin la calle
  await page.goto(`/seguimiento?pedido=${number}`);
  const card = page.locator(".tr-card");
  await expect(card).toContainText(`Pedido #${number}`);
  await expect(card).toContainText("Etiqueta generada");
  await expect(card).toContainText("Pedido P.");
  await expect(card).toContainText("Palermo, CABA");
  await expect(card).not.toContainText("Gurruchaga");
  await expect(card.locator(".stop.is-done")).toHaveCount(2);

  // buscar desde el formulario, como lo escriba el cliente
  await page.getByLabel("Número de pedido o código Andreani").fill(`mg ${number?.replace("MG-", "")}`);
  await page.locator(".tr-form").getByRole("button", { name: "Buscar" }).click();
  await expect(page).toHaveURL(new RegExp(`pedido=${number}`));
  await page.getByLabel("Número de pedido o código Andreani").fill("MG-999999");
  await page.locator(".tr-form").getByRole("button", { name: "Buscar" }).click();
  await expect(page.getByText("No encontramos ese pedido")).toBeVisible();
});

test("tienda y pagos: datos de envío para Andreani (paquete, origen y remitente)", async ({ page }) => {
  await login(page);
  await page.goto("/taller/tienda");
  await ready(page);
  const box = page.locator("#envios");
  await expect(box).toContainText(/Andreani/);
  await box.getByLabel("Calle").fill("");
  await box.getByRole("button", { name: "Guardar datos de envío" }).click();
  await expect(box.locator(".field-error")).toContainText("Poné la calle");

  await box.getByLabel("Paquete por defecto").selectOption("caja_chica");
  await box.getByLabel("Calle").fill("Gurruchaga");
  await box.getByLabel("Altura").fill("1234");
  await box.getByLabel("Código postal").fill("1414");
  await box.getByLabel("Localidad").fill("CABA");
  await box.getByLabel("Teléfono").fill("1155551234");
  await box.getByLabel("Email").fill("hola@minigalu.com.ar");
  await box.getByRole("button", { name: "Guardar datos de envío" }).click();
  await expect(page.locator("#toast")).toContainText("Datos de envío guardados");

  await page.reload();
  await ready(page);
  await expect(page.locator("#envios").getByLabel("Calle")).toHaveValue("Gurruchaga");
  await expect(page.locator("#envios").getByLabel("Paquete por defecto")).toHaveValue("caja_chica");
});

test("automatizaciones: el pago queda en el registro, se pausa una regla y se edita un mensaje", async ({
  page,
  request,
}) => {
  const number = await paidOrder(request);
  test.skip(!number, "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  await login(page);
  await page.goto("/taller/automatizaciones");
  await ready(page);
  await expect(page.locator("#log")).toContainText(`#${number}`);

  const rule = page.locator('[data-rule="despachado"]');
  await rule.getByLabel("Activar Despachado").uncheck();
  await expect(page.locator("#toast")).toContainText("Pausada");
  await page.reload();
  await ready(page);
  await expect(page.locator('[data-rule="despachado"]').getByLabel("Activar Despachado")).not.toBeChecked();
  await page.locator('[data-rule="despachado"]').getByLabel("Activar Despachado").check();
  await expect(page.locator("#toast")).toContainText("Activada");

  await page.locator('[data-rule="listo_retirar"]').getByRole("button", { name: "Editar mensaje" }).click();
  const modal = page.getByRole("dialog", { name: "Editar mensaje" });
  await modal.getByLabel("Mensaje").fill("Hola ! Ya podés pasar.");
  await expect(modal.getByLabel("Vista previa")).toContainText("Hola ! Ya podés pasar.");
  await modal.getByRole("button", { name: "Guardar mensaje" }).click();
  await expect(page.locator("#toast")).toContainText("Mensaje guardado");

  await page.getByRole("button", { name: "Enviarme una prueba" }).click();
  await page
    .getByRole("dialog", { name: "Enviarme una prueba" })
    .getByRole("button", { name: "Enviar prueba" })
    .click();
  await expect(page.locator("#toast")).toContainText("mensajes de prueba");
});

test("clientes: la cuenta con su nena aparece con el cumple cerca y la nota queda guardada", async ({
  page,
  request,
}) => {
  // una clienta se registra y carga a su nena (cumple en 10 días)
  const email = `clienta-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;
  const api = "http://localhost:4000";
  const headers = { origin: "http://localhost:3000" };
  const signUp = await request.post(`${api}/auth/sign-up/email`, {
    headers,
    data: { email, password: "Clave.Prueba1", name: "Ana Prueba", firstName: "Ana", lastName: "Prueba" },
  });
  expect(signUp.ok()).toBe(true);
  const soon = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(5, 10);
  const child = await request.post(`${api}/me/children`, {
    headers,
    data: { name: "Olivia", birthday: `2021-${soon}`, size: "6", heightCm: null },
  });
  expect(child.ok()).toBe(true);

  await login(page);
  await page.goto("/taller/clientes");
  await ready(page);
  await page.getByLabel("Buscar cliente").fill(email);
  const row = page.locator("table.t tbody tr", { hasText: "Ana Prueba" });
  await expect(row).toContainText("Olivia · T6");
  await expect(row.locator(".bd.soon")).toContainText(/en (9|10|11) días/);
  await page.getByRole("button", { name: "Cumple en 30 días" }).click();
  await expect(row).toBeVisible();

  await row.click();
  const ficha = page.getByRole("complementary", { name: "Ficha del cliente" });
  await expect(ficha).toContainText("con cuenta");
  await ficha.getByLabel("Notas del taller").fill("Prefiere retirar en el taller");
  await ficha.getByLabel("Notas del taller").blur();
  await expect(page.getByText("Nota guardada")).toBeVisible();

  await page.reload();
  await ready(page);
  await page.getByLabel("Buscar cliente").fill(email);
  await page.locator("table.t tbody tr", { hasText: "Ana Prueba" }).click();
  await expect(
    page.getByRole("complementary", { name: "Ficha del cliente" }).getByLabel("Notas del taller"),
  ).toHaveValue("Prefiere retirar en el taller");
});
