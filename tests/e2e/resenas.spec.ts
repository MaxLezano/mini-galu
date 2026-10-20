import type { Page } from "@playwright/test";
import { ADMIN, expect, test } from "./fixtures";

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

test("reseña real: el cliente la deja con foto, Gaby la publica y la elige para el inicio", async ({
  page,
  request,
}) => {
  const config = await (await request.get("http://localhost:4000/checkout/config")).json();
  test.skip(config.gateway !== "simulado", "La API está con Mercado Pago real (MP_ACCESS_TOKEN en el .env)");
  test.slow();

  const number = await buyBow(page, `e2e-resena-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`);

  // el taller lo entrega y le escribe por WhatsApp con el link para reseñar
  await page.goto(`/taller/pedidos?pedido=${number}`);
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  const drawer = page.getByRole("complementary", { name: "Detalle del pedido" });
  for (const step of ["Empezar a preparar", "Marcar listo para retirar", "Marcar como retirado"])
    await drawer.getByRole("button", { name: step }).click();
  await expect(drawer.locator(".drawer-head .pill-status")).toHaveText(/Entregado/);
  await drawer.getByRole("button", { name: "Pedir reseña" }).click();
  const wa = page.getByRole("dialog", { name: "Mensaje por WhatsApp" });
  const link = /http:\/\/localhost:3000(\/resena\/\S+)/.exec(await wa.getByRole("textbox").inputValue())?.[1];
  expect(link).toBeTruthy();

  // el cliente: estrellas, qué le pareció, el talle y una foto (dibujada en el navegador: no hay fotos en el repo)
  await page.goto(link as string);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("¿Cómo le quedó?");
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
  await expect(item).toContainText("¡Gracias! La leemos y la sumamos a la tienda.");
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
