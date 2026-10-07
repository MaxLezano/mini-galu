/**
 * Capturas de página completa en los 4 tamaños del plan (375 / 820 / 1440 / 2560) con animaciones apagadas (?static).
 * Sirve para comparar la app contra los mockups.
 *
 *   node scripts/screenshots.mjs <url> [nombre] [anchos]
 *   node scripts/screenshots.mjs http://localhost:3000/ home 375,1440
 *   node scripts/screenshots.mjs http://localhost:5500/index.html mock-home 375,1440
 *
 * Salida: test-results/shots/<nombre>-<ancho>.png
 */
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const [url, name = "shot", widths = "375,820,1440,2560"] = process.argv.slice(2);
if (!url) {
  console.error("Uso: node scripts/screenshots.mjs <url> [nombre] [anchos]");
  process.exit(1);
}
const out = "test-results/shots";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const w of widths.split(",").map(Number)) {
  const page = await browser.newPage({
    viewport: { width: w, height: w < 600 ? 812 : w < 1000 ? 1180 : 900 },
    reducedMotion: "reduce",
  });
  const u = new URL(url);
  u.searchParams.set("static", "");
  await page.goto(u.toString(), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // carga todas las imágenes lazy
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img[loading=lazy]")) img.loading = "eager";
    await Promise.all(
      [...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))),
    );
  });
  await page.screenshot({ path: `${out}/${name}-${w}.png`, fullPage: true });
  console.log(`✓ ${out}/${name}-${w}.png`);
  await page.close();
}
await browser.close();
