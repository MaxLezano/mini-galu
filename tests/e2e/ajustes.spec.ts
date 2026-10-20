import { ADMIN, expect, test } from "./fixtures";

const API = "http://localhost:4000";

test("calculá tu envío: Andreani, acordar envío y, en la ciudad del taller, el cadete desde $3.000", async ({
  page,
}) => {
  const policies = await (await page.request.get(`${API}/policies`)).json();
  test.skip(
    !policies.methods.cadete || !policies.methods.acordar,
    "Cadete o envío a acordar apagados en Tienda y pagos",
  );
  const cp = String(policies.localDelivery.cps).match(/\d{4}/)?.[0] ?? "4000";

  await page.goto("/producto/maddie");
  await page.getByLabel("Código postal").fill(cp);
  await page.getByRole("button", { name: "Calcular" }).click();
  const row = page.locator(".ship-res > div", { hasText: `Cadete en ${policies.workshop.city}` });
  await expect(row).toContainText(/Desde \$\s?\d/);
  await expect(row.getByRole("link", { name: "Escribinos" })).toHaveAttribute("href", /^https:\/\/wa\.me\/\d+/);
  await expect(page.locator(".ship-res > div", { hasText: "Acordar envío" })).toContainText("A coordinar");

  // afuera de la ciudad no aparece
  await page.getByLabel("Código postal").fill("1414");
  await page.getByRole("button", { name: "Calcular" }).click();
  await expect(page.locator(".ship-res")).toContainText("Andreani a domicilio");
  await expect(page.locator(".ship-res")).not.toContainText("Cadete");
});

test("lo que cambia Gaby en Tienda y pagos (gift cards y contacto) se ve igual en toda la tienda", async ({
  page,
}, info) => {
  // los dos proyectos corren a la vez sobre la misma base: este cambia ajustes, así que corre en uno solo
  test.skip(info.project.name === "celular", "Cambia ajustes compartidos: corre solo en escritorio");
  const before = await (await page.request.get(`${API}/policies`)).json();
  await page.goto("/taller/tienda");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
  await expect(page).toHaveURL(/\/taller\/tienda/);
  await expect(page.locator("body.adm-body")).toBeAttached();

  try {
    const months = before.giftcardMonths === 3 ? 4 : 3;
    const gc = page.locator("#giftcards");
    await gc.getByLabel("Meses que vale desde que se activa").fill(String(months));
    await gc.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(page.locator("#toast")).toContainText("Vigencia de las gift cards guardada");

    const datos = page.locator("#datos");
    await datos.getByLabel("WhatsApp").fill("381 555-0000");
    await datos.getByRole("button", { name: "Guardar datos de la tienda" }).click();
    await expect(page.locator("#toast")).toContainText("Datos de la tienda guardados");

    const shop = await page.context().newPage();
    await shop.goto("/giftcards");
    await expect(shop.locator("main")).toContainText(`Vale ${months} meses`);
    await shop.goto("/ayuda/terminos");
    await expect(shop.locator("main")).toContainText(`valen ${months} meses`);
    await expect(shop.getByRole("contentinfo").getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/5493815550000",
    );
    // las otras cajas no se pisaron
    const after = await (await page.request.get(`${API}/policies`)).json();
    expect(after.exchangeDays).toBe(before.exchangeDays);
    expect(after.zones).toEqual(before.zones);
  } finally {
    // vuelve a lo que había, aunque falle (corre sobre la base local de todos los días)
    const r = await page.request.put(`${API}/admin/policies`, {
      data: { giftcardMonths: before.giftcardMonths, contact: before.contact },
      headers: { origin: "http://localhost:3000" },
    });
    expect(r.ok()).toBe(true);
  }
});
