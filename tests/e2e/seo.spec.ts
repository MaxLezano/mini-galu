import { expect, test } from "./fixtures";

test("seo: robots y sitemap con las páginas públicas y sin el panel", async ({ request }) => {
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).toContain("Disallow: /taller");
  expect(robots).toMatch(/Sitemap: .+\/sitemap\.xml/);

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).toMatch(/<loc>[^<]+\/catalogo<\/loc>/);
  expect(sitemap).toMatch(/<loc>[^<]+\/ayuda\/terminos<\/loc>/);
  expect(sitemap).toMatch(/<loc>[^<]+\/producto\/mono-verde<\/loc>/);
  expect(sitemap).not.toContain("/taller");
});

test("seo: la ficha tiene canonical, Open Graph y datos estructurados del producto", async ({ page }) => {
  await page.goto("/producto/mono-verde");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/producto\/mono-verde$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /^https?:\/\//);

  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "{}");
  const product = ld["@graph"].find((n: { "@type": string }) => n["@type"] === "Product");
  expect(product.offers).toMatchObject({ priceCurrency: "ARS", availability: "https://schema.org/InStock" });
  expect(Number(product.offers.price)).toBeGreaterThan(0);

  await page.goto("/catalogo?col=accesorios");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/catalogo$/);
});
