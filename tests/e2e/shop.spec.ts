import { expect, test } from "./fixtures";

test("la home muestra el lanzamiento con cuenta regresiva y el carrusel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hecho a mano");
  await expect(page.locator("#lanzamiento .countdown b").first()).not.toHaveText("--");
  await expect(page.locator(".rail .p-card").first()).toBeVisible();
});

test("el catálogo filtra por talle desde la URL y solo muestra talles con stock", async ({ page }) => {
  await page.goto("/catalogo?talle=12m");
  await expect(page.locator(".grid .p-card")).toHaveCount(1);
  await expect(page.locator(".grid .p-name")).toHaveText("Vestido Rebeca");
  await expect(page.locator(".active-row")).toContainText("Talle 12m");
});

test("agregar a la bolsa desde la ficha abre la bolsa con la prenda", async ({ page }) => {
  await page.goto("/producto/maddie");
  await page.getByRole("radio", { name: /Talle 6/ }).click();
  await page.getByRole("button", { name: "Agregar a la bolsa" }).first().click();
  const drawer = page.locator("#drawer");
  await expect(drawer).toHaveClass(/is-open/);
  await expect(drawer.locator(".line-item")).toContainText("Set Maddie Bordado");
  await expect(drawer.locator(".line-item")).toContainText("Talle 6");
});

test("un talle agotado ofrece anotarse en la lista de espera", async ({ page }) => {
  await page.goto("/producto/samanta");
  await page.getByRole("radio", { name: /Talle 6, sin stock/ }).click();
  const modal = page.getByRole("dialog", { name: "Avisame cuando vuelva" });
  await expect(modal).toBeVisible();
  await modal.getByLabel("WhatsApp").fill(`11 ${String(Date.now()).slice(-4)}-${String(Math.random()).slice(2, 6)}`);
  await modal.getByRole("button", { name: /Avisame/ }).click();
  await expect(page.locator("#toast")).toContainText(/Te avisamos|Ya estabas anotada/);
});

// Galú con modelo: la respuesta de la API se fija acá (el texto de un LLM no es determinístico);
// las tools sobre el stock real se prueban en apps/api/src/assistant
test("Galú responde con el modelo: texto de a pedazos y tarjetas", async ({ page, request }) => {
  const products = await (await request.get("http://localhost:4000/catalog/products?talle=2")).json();
  let asked: { messages: { role: string; text: string }[] } | null = null;
  await page.route("**/assistant/chat", async (route) => {
    asked = route.request().postDataJSON();
    const sse = [
      { type: "text", delta: "En talle 2 " },
      { type: "text", delta: "tengo **estos** modelos." },
      { type: "products", products: products.slice(0, 2), size: "2" },
      { type: "done" },
    ]
      .map((e) => `event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`)
      .join("");
    await route.fulfill({ status: 200, headers: { "content-type": "text/event-stream" }, body: sse });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  await page.getByLabel("Mensaje").fill("¿qué hay en talle 2?");
  await page.getByLabel("Mensaje").press("Enter");
  await expect(page.locator(".galu-body")).toContainText("En talle 2 tengo estos modelos.");
  await expect(page.locator(".galu-body .msg.bot b", { hasText: "estos" })).toBeVisible();
  await expect(page.locator(".galu-body .mini-card")).toHaveCount(Math.min(2, products.length));
  // la charla lleva su id para quedar guardada en el panel (admin-galu)
  expect(asked).toEqual({
    messages: [{ role: "user", text: "¿qué hay en talle 2?" }],
    conversationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
  });
});

test("sin modelo en la API, Galú responde por reglas con el stock real", async ({ page }) => {
  await page.route("**/assistant/chat", (route) =>
    route.fulfill({ status: 503, json: { error: { code: "assistant_off", message: "sin modelo" } } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  await page.getByLabel("Mensaje").fill("¿qué hay en talle 2?");
  await page.getByLabel("Mensaje").press("Enter");
  await expect(page.locator(".galu-body")).toContainText(/En talle 2 tengo \d+ modelos/);
  await expect(page.locator(".galu-body .mini-card").first()).toBeVisible();
});

test("con el mouse, las sugerencias de Galú se arrastran de costado sin mandarse", async ({ page }) => {
  test.skip(test.info().project.name === "celular", "en táctil desplaza el navegador");
  await page.goto("/?static"); // sin la entrada animada del panel: la caja de las sugerencias queda quieta
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  const sugs = page.locator(".galu-sugs");
  await expect(sugs.locator(".chip").first()).toBeVisible();
  const msgs = await page.locator(".galu-body .msg").count();
  const box = await sugs.boundingBox();
  if (!box) throw new Error("sin sugerencias");
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width - 40, y);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 140, y, { steps: 8 });
  await page.mouse.up();
  expect(await sugs.evaluate((el) => el.scrollLeft)).toBeGreaterThan(50);
  await expect(page.locator(".galu-body .msg")).toHaveCount(msgs);
  // un click común sigue mandando la sugerencia
  await sugs.locator(".chip").first().click();
  await expect(page.locator(".galu-body .msg")).not.toHaveCount(msgs);
});
