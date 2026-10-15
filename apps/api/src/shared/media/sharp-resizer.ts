import type { ImageFormat, ImageWidth } from "@mini-galu/contracts";
import sharp from "sharp";
import type { ImageResizer } from "./responsive-image-storage";

/** Adapter con sharp: respeta la orientación EXIF, no agranda y saca los metadatos (GPS del celular incluido). */
export class SharpResizer implements ImageResizer {
  async resize(bytes: Uint8Array, width: ImageWidth, format: ImageFormat): Promise<Uint8Array> {
    const img = sharp(bytes).rotate().resize({ width, withoutEnlargement: true });
    const out = format === "avif" ? img.avif({ quality: 52, effort: 4 }) : img.webp({ quality: 76 });
    return new Uint8Array(await out.toBuffer());
  }
}
