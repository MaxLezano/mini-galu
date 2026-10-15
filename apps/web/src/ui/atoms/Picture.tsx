import { imageSrcSet } from "@mini-galu/contracts";
import type { ComponentProps } from "react";

type Props = Omit<ComponentProps<"img">, "src" | "srcSet" | "sizes"> & {
  src: string;
  /** Ancho que ocupa la foto en pantalla (atributo `sizes`): con eso el navegador elige la variante. */
  sizes: string;
};

/**
 * Foto del ImageStorage en AVIF/WebP con `srcset` (las variantes las genera la API). El `<picture>` no arma caja
 * (`display: contents` en atelier.css), así que las clases y el CSS del mockup siguen yendo sobre el `<img>`.
 * Lo que no viene del storage (blob de una vista previa, una URL externa) sale como `<img>` común.
 */
export function Picture({ src, sizes, alt, ...img }: Props) {
  const avif = imageSrcSet(src, "avif");
  if (!avif) return <img src={src} alt={alt} {...img} />;
  return (
    <picture>
      <source type="image/avif" srcSet={avif} sizes={sizes} />
      <source type="image/webp" srcSet={imageSrcSet(src, "webp")} sizes={sizes} />
      <img src={src} alt={alt} {...img} />
    </picture>
  );
}
