import { describe, expect, it } from "vitest";
import { hasImageVariants, imageSrcSet, imageThumb, imageVariant, parseImageVariant } from "./media";

const url = "http://localhost:4000/media/products/maddie-1.webp";

describe("variantes de fotos", () => {
  it("arma la URL de cada variante cambiando la extensión", () => {
    expect(imageVariant(url, 640, "avif")).toBe("http://localhost:4000/media/products/maddie-1@640.avif");
    expect(imageVariant("https://cdn.x/media/content/hero.JPG", 320, "webp")).toBe(
      "https://cdn.x/media/content/hero@320.webp",
    );
  });

  it("arma el srcset con todos los anchos", () => {
    expect(imageSrcSet(url, "webp")).toBe(
      [320, 640, 960, 1440, 1920]
        .map((w) => `http://localhost:4000/media/products/maddie-1@${w}.webp ${w}w`)
        .join(", "),
    );
  });

  it("deja igual lo que no viene del ImageStorage o ya es una variante", () => {
    for (const other of ["", "blob:http://x/1", "data:image/png;base64,AA", "https://x.com/foto.webp", `${url}@1`]) {
      expect(hasImageVariants(other)).toBe(false);
      expect(imageSrcSet(other, "avif")).toBeUndefined();
      expect(imageThumb(other)).toBe(other);
    }
    expect(hasImageVariants("http://localhost:4000/media/products/a@640.webp")).toBe(false);
  });

  it("la miniatura es la variante WebP de 320", () => {
    expect(imageThumb(url)).toBe("http://localhost:4000/media/products/maddie-1@320.webp");
  });

  it("la API reconoce solo anchos y formatos válidos", () => {
    expect(parseImageVariant("products/a@640.avif")).toEqual({ base: "products/a", width: 640, format: "avif" });
    expect(parseImageVariant("products/a@641.avif")).toBeNull();
    expect(parseImageVariant("products/a@640.png")).toBeNull();
    expect(parseImageVariant("products/a.webp")).toBeNull();
  });
});
