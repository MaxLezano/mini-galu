import { expect, test } from "./fixtures";

// En CI no hay fotos (local-assets no va al repo): se chequea el markup, no que las variantes carguen.
test("imágenes: las fotos del storage salen en AVIF/WebP con srcset y las miniaturas en WebP chico", async ({
  page,
}) => {
  await page.goto("/");
  const hero = page.locator(".hero picture");
  await expect(hero.locator('source[type="image/avif"]')).toHaveAttribute(
    "srcset",
    /@320\.avif 320w,.+@1920\.avif 1920w/,
  );
  await expect(hero.locator('source[type="image/webp"]')).toHaveAttribute("srcset", /@640\.webp 640w/);
  await expect(hero.locator("source").first()).toHaveAttribute("sizes", "100vw");
  await expect(hero.locator("img")).toHaveAttribute("fetchpriority", "high");

  await page.goto("/producto/mono-verde");
  await expect(page.locator(".gallery picture source[type='image/avif']").first()).toHaveAttribute("srcset", /avif/);
  await expect(page.locator(".gallery img[src*='@320.webp']").first()).toBeAttached();
  await expect(page.locator(".p-card picture source[type='image/avif']").first()).toHaveAttribute("sizes", /50vw/);
});
