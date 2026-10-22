import { expect, test } from "./fixtures";

test("la home muestra el lanzamiento con cuenta regresiva y el carrusel", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Hecho a mano");
  await expect(page.locator("#lanzamiento .countdown b").first()).not.toHaveText("--");
  await expect(page.locator(".rail .p-card").first()).toBeVisible();
});

test("sin token de Instagram, la grilla de la home muestra las fotos de la portada y lleva al perfil", async ({
  page,
}) => {
  await page.goto("/");
  const tiles = page.locator(".ig a");
  await expect(tiles).toHaveCount(6);
  await expect(tiles.first()).toHaveAttribute("href", "https://www.instagram.com/minigalumodainfantil/");
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

test("calculá tu envío cotiza con la API la bolsa más la prenda", async ({ page }) => {
  await page.goto("/producto/maddie");
  await page.getByLabel("Código postal").fill("1414");
  const asked = page.waitForRequest((r) => /\/checkout\/shipping\?cp=1414&extra=\d+/.test(r.url()));
  await page.getByRole("button", { name: "Calcular" }).click();
  await asked;
  const res = page.locator(".ship-res");
  await expect(res).toContainText("Andreani a domicilio");
  await expect(res).toContainText("Andreani a sucursal");
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
  const saved = page.waitForResponse("**/assistant/log");
  await expect(page.locator(".galu-body")).toContainText(/En talle 2 tengo \d+ modelos/);
  await expect(page.locator(".galu-body .mini-card").first()).toBeVisible();
  // la charla queda en el panel igual que con el modelo (la API real la guarda)
  const first = await saved;
  expect(first.status()).toBe(204);
  const body = first.request().postDataJSON();
  expect(body).toMatchObject({
    conversationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
    question: "¿qué hay en talle 2?",
    answer: expect.stringMatching(/^En talle 2 tengo \d+ modelos/),
    unanswered: false,
  });

  // lo que no sabe va a "Enseñale", en la misma charla (no llega a la API: no pisa las preguntas demo del panel)
  await page.route("**/assistant/log", (route) => route.fulfill({ status: 204 }));
  const unknown = page.waitForRequest("**/assistant/log");
  await page.getByLabel("Mensaje").fill("¿hacen arreglos de ruedo?");
  await page.getByLabel("Mensaje").press("Enter");
  await expect(page.locator(".galu-body .msg.bot").last()).toContainText("Eso todavía no lo sé");
  expect((await unknown).postDataJSON()).toMatchObject({
    conversationId: body.conversationId,
    question: "¿hacen arreglos de ruedo?",
    unanswered: true,
  });
});

test("sin modelo en la API, Galú sabe de telas, colores y cambios con el catálogo y Tienda y pagos", async ({
  page,
}) => {
  await page.route("**/assistant/chat", (route) =>
    route.fulfill({ status: 503, json: { error: { code: "assistant_off", message: "sin modelo" } } }),
  );
  await page.route("**/assistant/log", (route) => route.fulfill({ status: 204 }));
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  const ask = async (q: string) => {
    await page.getByLabel("Mensaje").fill(q);
    await page.getByLabel("Mensaje").press("Enter");
  };
  const last = page.locator(".galu-body .msg.bot").last();
  await ask("¿de qué tela son los vestidos?");
  await expect(last).toContainText(/Trabajamos con .*lino/);
  await ask("¿tenés algo rojo?");
  await expect(last).toContainText("En rojo tengo estos");
  await expect(page.locator(".galu-body .msg.cards").last().locator(".mini-card").first()).toBeVisible();
  await ask("le quedó grande, ¿lo puedo cambiar?");
  await expect(last).toContainText(/tenés \d+ días? desde que recibís el pedido/);
  await expect(last.getByRole("link", { name: "Cambios y devoluciones" })).toHaveAttribute("href", "/ayuda/cambios");
});

test("sin modelo en la API, Galú dice las cuotas reales de Mercado Pago para la prenda", async ({ page }) => {
  await page.route("**/assistant/chat", (route) =>
    route.fulfill({ status: 503, json: { error: { code: "assistant_off", message: "sin modelo" } } }),
  );
  // el plan lo fija el test: Mercado Pago confirma 3 sin interés para cualquier monto
  await page.route("**/checkout/installments?*", (route) => {
    const amounts = new URL(route.request().url()).searchParams.get("amounts")?.split(",") ?? [];
    return route.fulfill({ json: Object.fromEntries(amounts.map((a) => [a, { interestFree: 3, max: 12 }])) });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  await page.getByLabel("Mensaje").fill("¿en cuántas cuotas puedo pagar el Samanta?");
  await page.getByLabel("Mensaje").press("Enter");
  const reply = page.locator(".galu-body .msg.bot").last();
  await expect(reply).toContainText(/Samanta Plumeti está .+ Lo podés pagar en 3 cuotas sin interés de .+\./);
  await expect(page.locator(".galu-body .mini-card")).toHaveCount(1);
});

test("sin modelo en la API, Galú busca el pedido por su número", async ({ page }) => {
  await page.route("**/assistant/chat", (route) =>
    route.fulfill({ status: 503, json: { error: { code: "assistant_off", message: "sin modelo" } } }),
  );
  await page.route("**/tracking/MG-1042", (route) =>
    route.fulfill({
      json: {
        number: "MG-1042",
        status: "en_camino",
        shippingMethod: "domicilio",
        createdAt: "2026-10-10T12:00:00Z",
        paidAt: "2026-10-10T12:05:00Z",
        totalCents: 5_000_000,
        items: [],
        destination: "Palermo, CABA",
        recipient: "Lucía F.",
        shipment: { carrier: "Andreani", trackingNumber: "360000123456789", url: null },
        stops: [
          { title: "Pedido confirmado", detail: "", done: true },
          { title: "En camino", detail: "", done: true },
          { title: "Entregado", detail: "", done: false },
        ],
        log: [{ title: "En tránsito", detail: "Centro de distribución", at: "2026-10-12T09:00:00Z" }],
        payUrl: null,
      },
    }),
  );
  await page.route("**/tracking/MG-9999", (route) =>
    route.fulfill({ status: 404, json: { error: { code: "not_found", message: "No encontramos ese pedido" } } }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir asistente Galú" }).click();
  const msg = page.getByLabel("Mensaje");
  await msg.fill("¿Dónde está mi pedido?");
  await msg.press("Enter");
  await expect(page.locator(".galu-body")).toContainText("Pasame el número de tu pedido");
  await msg.fill("mg 1042");
  await msg.press("Enter");
  const found = page.locator(".galu-body .msg.bot").last();
  await expect(found).toContainText("Tu pedido #MG-1042 está en camino: Ya salió hacia vos.");
  await expect(found).toContainText("Último movimiento: En tránsito. Lo que sigue: Entregado.");
  await expect(found.getByRole("link", { name: "Ver el seguimiento" })).toHaveAttribute(
    "href",
    "/seguimiento?pedido=MG-1042",
  );
  await msg.fill("9999");
  await msg.press("Enter");
  await expect(page.locator(".galu-body .msg.bot").last()).toContainText("No encontré el pedido MG-9999");
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
