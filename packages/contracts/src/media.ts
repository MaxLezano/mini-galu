/**
 * Variantes de las fotos del ImageStorage: cada original ("products/maddie-1.webp") tiene copias en AVIF y WebP
 * de varios anchos ("products/maddie-1@640.avif"). La API las genera con sharp (al subir y, para las que faltan,
 * la primera vez que se piden); la web arma `srcset` con estas mismas reglas.
 */
export const IMAGE_WIDTHS = [320, 640, 960, 1440, 1920] as const;
export const IMAGE_FORMATS = ["avif", "webp"] as const;
export type ImageWidth = (typeof IMAGE_WIDTHS)[number];
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

/** Originales que tienen variantes: lo servido bajo `/media/` con extensión de foto (no las variantes en sí). */
const ORIGINAL = /^(.*\/media\/.+?)\.(webp|jpe?g|png|avif)(\?.*)?$/i;
const VARIANT = /^(.+)@(\d+)\.(avif|webp)$/;

export function hasImageVariants(url: string): boolean {
  return ORIGINAL.test(url) && !VARIANT.test(url.split("?")[0] ?? "");
}

/** URL (o ruta) de una variante: "…/media/products/a.webp" → "…/media/products/a@640.avif". */
export function imageVariant(url: string, width: ImageWidth, format: ImageFormat): string {
  const m = ORIGINAL.exec(url);
  return m ? `${m[1]}@${width}.${format}` : url;
}

/** `srcset` de un formato con todos los anchos, o undefined si la foto no tiene variantes. */
export function imageSrcSet(url: string, format: ImageFormat): string | undefined {
  if (!hasImageVariants(url)) return undefined;
  return IMAGE_WIDTHS.map((w) => `${imageVariant(url, w, format)} ${w}w`).join(", ");
}

/** Miniatura chica en WebP (bolsa, pedidos, avatares): un solo archivo, sin `<picture>`. */
export function imageThumb(url: string): string {
  return hasImageVariants(url) ? imageVariant(url, 320, "webp") : url;
}

/** Para la API: "products/a@640.avif" → { base: "products/a", width: 640, format: "avif" } si es un ancho válido. */
export function parseImageVariant(path: string): { base: string; width: ImageWidth; format: ImageFormat } | null {
  const m = VARIANT.exec(path);
  if (!m) return null;
  const width = Number(m[2]) as ImageWidth;
  if (!IMAGE_WIDTHS.includes(width)) return null;
  return { base: m[1] as string, width, format: m[3] as ImageFormat };
}
