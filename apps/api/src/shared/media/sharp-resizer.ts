import type { ImageFormat, ImageWidth } from "@mini-galu/contracts";
import sharp from "sharp";
import { coverBox, type ImageCropper } from "./image-cropper";
import type { ImageResizer } from "./responsive-image-storage";

/** Adapter con sharp: respeta la orientación EXIF, no agranda y saca los metadatos (GPS del celular incluido). */
export class SharpResizer implements ImageResizer {
  async resize(bytes: Uint8Array, width: ImageWidth, format: ImageFormat): Promise<Uint8Array> {
    const img = sharp(bytes).rotate().resize({ width, withoutEnlargement: true });
    const out = format === "avif" ? img.avif({ quality: 52, effort: 4 }) : img.webp({ quality: 76 });
    return new Uint8Array(await out.toBuffer());
  }
}

/**
 * Adapter con sharp: recorta donde está lo que llama la atención (la prenda, no el fondo) y deja el mismo formato
 * con calidad alta, porque de este original salen las variantes. Aunque ya tenga la proporción (o no se recorte)
 * se vuelve a codificar: así se van los metadatos (GPS, modelo del celular) y la orientación queda aplicada.
 */
export class SharpCropper implements ImageCropper {
  async crop(bytes: Uint8Array, aspect: number | null): Promise<Uint8Array> {
    const meta = await sharp(bytes).metadata();
    if (!meta.width || !meta.height) return bytes;
    // orientaciones EXIF 5–8 giran 90°: el ancho real es el alto guardado
    const turned = (meta.orientation ?? 1) >= 5;
    const box =
      aspect === null ? null : coverBox(turned ? meta.height : meta.width, turned ? meta.width : meta.height, aspect);
    const rotated = sharp(bytes).rotate();
    const img = box ? rotated.resize({ ...box, fit: "cover", position: sharp.strategy.attention }) : rotated;
    const out =
      meta.format === "jpeg"
        ? img.jpeg({ quality: 90, mozjpeg: true })
        : meta.format === "png"
          ? img.png()
          : meta.format === "heif"
            ? img.avif({ quality: 70 })
            : img.webp({ quality: 90 });
    return new Uint8Array(await out.toBuffer());
  }
}
