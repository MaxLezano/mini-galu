import { chromium } from "@playwright/test";

const b = await chromium.launch();
const p = await b.newPage();
await p.goto("http://localhost:3000/taller");
await p.getByLabel("Email").fill("gaby@minigalu.com.ar");
await p.getByLabel("Contraseña", { exact: true }).fill("Taller.MiniGalu1");
await p.getByRole("button", { name: "Entrar al taller" }).click();
try {
  await p.waitForURL("**/taller/productos", { timeout: 8000 });
  console.log("OK", p.url());
} catch {
  console.log("COLGADO en", p.url(), "botón:", await p.locator("button[type=submit]").textContent());
}
await b.close();
