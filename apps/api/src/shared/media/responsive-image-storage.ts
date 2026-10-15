import { IMAGE_FORMATS, IMAGE_WIDTHS, type ImageFormat, type ImageWidth } from "@mini-galu/contracts";
import type { ImageStorage } from "./image-storage";

/** Puerto: achica una foto a un ancho (sin agrandarla) y la codifica en AVIF o WebP. */
export interface ImageResizer {
  resize(bytes: Uint8Array, width: ImageWidth, format: ImageFormat): Promise<Uint8Array>;
}

/** "products/a.webp" → "products/a@640.avif" (misma regla que `imageVariant` de contracts sobre la URL). */
export const variantPath = (path: string, width: ImageWidth, format: ImageFormat) =>
  `${path.replace(/\.[a-z0-9]+$/i, "")}@${width}.${format}`;

/** Decorador del ImageStorage: al guardar una foto guarda también sus variantes AVIF/WebP en todos los anchos. */
export class ResponsiveImageStorage implements ImageStorage {
  constructor(
    private readonly inner: ImageStorage,
    private readonly resizer: ImageResizer,
  ) {}

  url(path: string): string {
    return this.inner.url(path);
  }

  async save(path: string, bytes: Uint8Array): Promise<string> {
    const saved = await this.inner.save(path, bytes);
    // en paralelo: sharp reparte el trabajo en su pool de hilos
    await Promise.all(
      IMAGE_FORMATS.flatMap((format) =>
        IMAGE_WIDTHS.map(async (width) =>
          this.inner.save(variantPath(saved, width, format), await this.resizer.resize(bytes, width, format)),
        ),
      ),
    );
    return saved;
  }
}
