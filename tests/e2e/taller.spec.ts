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
  await expect(page).toHaveURL(/\/taller\/productos/);
  await expect(page.getByRole("heading", { name: "Productos" })).toBeVisible();
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
async function paidOrder(request: import("@playwright/test").APIRequestContext): Promise<string | null> {
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
        shipping: { method: "taller", pickupSlot: slot },
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
