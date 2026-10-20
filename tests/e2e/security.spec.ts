import { createHmac } from "node:crypto";
import type { Page } from "@playwright/test";
import { ADMIN, expect, test } from "./fixtures";

/** Código TOTP (RFC 6238, SHA-1, 6 números, 30 s), como lo calcula una app autenticadora. */
function totp(secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const ch of secret.replace(/=+$/, "").toUpperCase()) bits += alphabet.indexOf(ch).toString(2).padStart(5, "0");
  const key = Buffer.from((bits.match(/.{8}/g) ?? []).map((b) => Number.parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 30_000)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = (h[h.length - 1] ?? 0) & 0xf;
  const n = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString();
  return n.padStart(6, "0");
}

async function login(page: Page) {
  await page.goto("/taller/ingresar");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Contraseña", { exact: true }).fill(ADMIN.password);
  await page.getByRole("button", { name: "Entrar al taller" }).click();
}

test("verificación en dos pasos: se activa con la app, el ingreso pide el código y se desactiva", async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/taller$/);
  await page.goto("/taller/seguridad");
  const box = page.locator("#dos-pasos");
  await box.getByLabel("Tu contraseña").fill(ADMIN.password);
  await box.getByRole("button", { name: "Activar la verificación en dos pasos" }).click();
  const secret = (await box.locator("code.secret").textContent()) ?? "";
  expect(secret).toMatch(/^[A-Z2-7]+=*$/);
  try {
    await box.getByLabel(/código de 6 números/).fill(totp(secret));
    await box.getByRole("button", { name: "Confirmar y activar" }).click();
    await expect(box.locator("[data-codes]")).toBeVisible();
    await expect(box.locator(".pill-status")).toHaveText("Activada");

    // salir y volver a entrar: después de la contraseña pide el código
    await page.context().clearCookies();
    await login(page);
    await page.getByLabel("Código de verificación").fill("000000");
    await page.getByRole("button", { name: "Verificar y entrar" }).click();
    await expect(page.locator(".auth-error")).toContainText("Ese código no sirve");
    await page.getByLabel("Código de verificación").fill(totp(secret));
    await page.getByRole("button", { name: "Verificar y entrar" }).click();
    await expect(page).toHaveURL(/\/taller$/);
  } finally {
    // dejar la cuenta como estaba (los demás tests entran sin código)
    await page.goto("/taller/seguridad");
    const b = page.locator("#dos-pasos");
    if ((await b.locator(".pill-status").textContent()) === "Activada") {
      await b.getByLabel("Tu contraseña").fill(ADMIN.password);
      await b.getByRole("button", { name: "Desactivar" }).click();
      await expect(b.locator(".pill-status")).toHaveText("Desactivada");
    }
  }
});

test("cabeceras: ni la tienda ni la API se muestran dentro de un iframe ajeno", async ({ request }) => {
  const web = await request.get("/");
  expect(web.headers()["x-frame-options"]).toBe("DENY");
  expect(web.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(web.headers()["x-content-type-options"]).toBe("nosniff");
  const api = await request.get("http://localhost:4000/health");
  expect(api.headers()["x-content-type-options"]).toBe("nosniff");
  expect(api.headers()["x-frame-options"]).toBe("SAMEORIGIN");
  // las fotos las pide la tienda desde otro origen
  expect(api.headers()["cross-origin-resource-policy"]).toBe("cross-origin");
});

test("la API no acepta un JSON gigante en las rutas públicas", async ({ request }) => {
  const r = await request.post("http://localhost:4000/newsletter", {
    headers: { origin: "http://localhost:3000", "content-type": "application/json" },
    data: JSON.stringify({ email: "x@ejemplo.com", source: "x".repeat(400 * 1024) }),
  });
  expect(r.status()).toBe(413);
});

test("ingresar con ?volver= a otro sitio se queda en la tienda", async ({ page }) => {
  await page.goto(`/ingresar?volver=${encodeURIComponent("/\\example.com")}`);
  const auth = page.locator("main.auth");
  await page.getByRole("tab", { name: "Crear cuenta" }).click();
  await auth.getByLabel("Nombre", { exact: true }).fill("Ana");
  await auth.getByLabel("Apellido").fill("Volver");
  await auth.getByLabel("Email").fill(`volver-${Date.now()}-${Math.floor(Math.random() * 1e4)}@ejemplo.com`);
  await auth.getByLabel("Contraseña", { exact: true }).fill("Clave.Segura1");
  await page.getByRole("button", { name: "Crear mi cuenta" }).click();
  await expect(page).toHaveURL(/localhost:3000\/cuenta/);
});
