import type { APIRequestContext, Page } from "@playwright/test";
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

async function adminLogin(page: Page, path: string) {
  await page.goto(path);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
}

/** Desde el detalle del pedido abierto en el panel: lo entrega y devuelve el link para reseñar del WhatsApp. */
async function deliver(page: Page): Promise<string> {
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });
  await drawer.getByRole("button", { name: "Empezar a preparar" }).click();
  await drawer.getByLabel("Moño Verde Largo talle Único preparado").check();
  await drawer.getByRole("button", { name: "Marcar listo para retirar" }).click();
  await drawer.getByRole("button", { name: "Marcar como retirado" }).click();
  await expect(drawer.locator(".drawer-head .pill-status")).toHaveText(/Entregado/);
  await drawer.getByRole("button", { name: "Pedir reseña" }).click();
  const text = page.getByRole("dialog", { name: "Mensaje por WhatsApp" }).getByRole("textbox");
  // el mensaje se completa con el link apenas lo arma el panel: esperar a que esté
  await expect(text).toHaveValue(/\/resena\//);
  const link = /http:\/\/localhost:3000(\/resena\/\S+)/.exec(await text.inputValue())?.[1];
  expect(link).toBeTruthy();
  return link as string;
}

test("reseña real: el cliente la deja con foto, Gaby la publica y la elige para el inicio", async ({
  page,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  test.slow();

  const number = await buyBow(page, `e2e-resena-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`);

  // el taller lo entrega y le escribe por WhatsApp con el link para reseñar
  await adminLogin(page, `/taller/pedidos?pedido=${number}`);
  const link = await deliver(page);

  // el cliente: estrellas, qué le pareció, el talle y una foto (dibujada en el navegador: no hay fotos en el repo)
  await page.goto(link);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cómo le quedó?");
  // los puntos del mail del pedido: todavía ninguno
  await expect(page.locator(".rv-points")).toContainText("te suma 10 puntos (20 con foto)");
  await expect(page.locator(".rv-points")).toContainText("Tenés 0 puntos");

  const item = page.locator(".rv-item").first();
  await item.getByRole("button", { name: "Enviar reseña" }).click();
  await expect(item.getByRole("alert")).toHaveText("Elegí las estrellas");
  await item.locator(".star-pick label").nth(4).click();
  await expect(item.getByRole("radio", { name: "5 estrellas" })).toBeChecked();
  const body = `Divino el moño, lo usó en el acto de la escuela ${Date.now()}`;
  await item.getByLabel("Contanos qué te pareció").fill(body);
  await item.getByRole("button", { name: "Justo" }).click();
  const jpg = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    ctx.fillStyle = "#7f9a7a";
    ctx.fillRect(0, 0, 300, 400);
    return canvas.toDataURL("image/jpeg").split(",")[1];
  });
  await item
    .locator('input[type="file"]')
    .setInputFiles({ name: "nena.jpg", mimeType: "image/jpeg", buffer: Buffer.from(jpg, "base64") });
  await expect(item.getByRole("img", { name: "Tu foto" })).toBeVisible();
  await expect(item).toContainText("Va a aparecer como «Lucía F.»");
  await item.getByRole("button", { name: "Enviar reseña" }).click();
  await expect(item).toContainText("¡Gracias! La leemos y, cuando la publiquemos, sumás 20 puntos.");
  await page.reload();
  await expect(page.locator(".rv-item").first()).toContainText(body);

  // pendiente: todavía no se ve en la ficha
  await page.goto("/producto/mono-verde");
  await expect(page.locator("main")).not.toContainText(body);

  // Gaby la publica y la elige para "Lo que dicen las familias"
  await page.goto("/taller/resenas");
  const card = page.getByRole("article", { name: "Reseña de Lucía F." }).filter({ hasText: body });
  await expect(card).toContainText(`#${number}`);
  await expect(card.getByRole("img", { name: "Foto de Lucía F." })).toBeVisible();
  await card.getByRole("button", { name: "Publicar" }).click();
  await expect(page.locator("#toast")).toContainText("Reseña publicada");
  // publicada: le suma los puntos (con foto, 20) al mail del pedido
  await page.goto(link);
  await expect(page.locator(".rv-points")).toContainText("Tenés 20 puntos: te faltan 80 para el cupón.");
  await page.goto("/taller/resenas");
  await page.getByRole("button", { name: /^Publicadas/ }).click();
  await card.getByRole("button", { name: "Mostrar en el inicio" }).click();
  await expect(page.locator("#toast")).toContainText("Va a salir en el inicio");

  await page.goto("/producto/mono-verde");
  await expect(page.locator("#resenas")).toContainText(body);
  await page.goto("/");
  await expect(page.locator(".reviews-track")).toContainText(body);

  // oculta: sale de la ficha y del inicio (y la home queda como estaba para los demás tests)
  await page.goto("/taller/resenas");
  await page.getByRole("button", { name: /^En el inicio/ }).click();
  await card.getByRole("button", { name: "Ocultar" }).click();
  await expect(page.locator("#toast")).toContainText("Reseña oculta");
  await page.goto("/");
  await expect(page.locator(".reviews-track")).not.toContainText(body);
});

/** Link del último mail con ese asunto (Mailpit); null si no hay Mailpit. */
async function mailLink(request: APIRequestContext, to: string, subject: string): Promise<string | null> {
  const ok = await request.get(`${MAILPIT}/messages?limit=1`).catch(() => null);
  if (!ok?.ok()) return null;
  let text = "";
  await expect
    .poll(async () => {
      const q = encodeURIComponent(`to:${to} subject:"${subject}"`);
      const id = (await (await request.get(`${MAILPIT}/search?query=${q}`)).json()).messages?.[0]?.ID;
      if (id) text = (await (await request.get(`${MAILPIT}/message/${id}`)).json()).Text;
      return text;
    })
    .toContain("http");
  return /https?:\/\/\S+verify-email\S+/.exec(text)?.[0] ?? null;
}

test("puntos: Gaby baja el canje, la reseña publicada suma y el cliente canjea el cupón en Mi cuenta", async ({
  page,
  browser,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  test.slow();
  const email = `e2e-puntos-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`;

  // el cliente compra sin cuenta y crea la cuenta con ese mail (la confirma por el link del mail)
  const client = await browser.newPage();
  const number = await buyBow(client, email);
  await client.goto("/ingresar?crear");
  const auth = client.locator("main.auth");
  await auth.getByLabel("Nombre", { exact: true }).fill("Lucía");
  await auth.getByLabel("Apellido").fill("Fernández");
  await auth.getByLabel("Email").fill(email);
  await auth.getByLabel("Contraseña", { exact: true }).fill("Clave.Segura1");
  await client.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(client).toHaveURL(/\/cuenta/);
  const verify = await mailLink(request, email, "Confirmá tu mail");
  test.skip(!verify, "Sin Mailpit no se puede confirmar el mail");
  await client.goto(verify as string);

  // Gaby: canje con 10 puntos (una reseña sin foto) y entrega el pedido
  await adminLogin(page, "/taller/tienda");
  const box = page.locator("#puntos");
  const before = await box.getByLabel("Puntos para canjear").inputValue();
  await box.getByLabel("Puntos para canjear").fill("10");
  await expect(box).toContainText("Alcanza con 1 reseña publicada con foto por cupón");
  await box.getByRole("button", { name: "Guardar" }).click();
  await expect(page.locator("#toast")).toContainText("Puntos por reseñas guardados");
  try {
    await page.goto(`/taller/pedidos?pedido=${number}`);
    const link = await deliver(page);

    await client.goto(link);
    const item = client.locator(".rv-item").first();
    await item.locator(".star-pick label").nth(3).click();
    await item.getByLabel("Contanos qué te pareció").fill(`Muy lindo el moño, buena calidad ${Date.now()}`);
    await item.getByRole("button", { name: "Enviar reseña" }).click();
    await expect(item).toContainText("cuando la publiquemos, sumás 10 puntos");

    await page.goto("/taller/resenas");
    const card = page.getByRole("article", { name: "Reseña de Lucía F." }).filter({ hasText: `#${number}` });
    await card.getByRole("button", { name: "Publicar" }).click();
    await expect(page.locator("#toast")).toContainText("Reseña publicada");

    // Mi cuenta → Puntos: canjea y aparece su cupón personal
    await client.goto("/cuenta#puntos");
    const panel = client.locator("#p-puntos");
    await expect(panel).toContainText("10 puntos");
    await panel.getByRole("button", { name: "Canjear 10 puntos" }).click();
    await expect(panel.locator(".my-gc")).toContainText(/PUNTOS-[A-Z0-9]{5} · 10% de descuento · vence el/);
    await expect(panel.locator(".pts-balance")).toContainText("0 puntos");
    await expect(panel.getByRole("button", { name: "Canjear 10 puntos" })).toBeDisabled();
  } finally {
    // los demás tests ven el canje de base
    await page.goto("/taller/tienda");
    await page.locator("#puntos").getByLabel("Puntos para canjear").fill(before);
    await page.locator("#puntos").getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator("#toast")).toContainText("Puntos por reseñas guardados");
  }
});
