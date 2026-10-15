/** Puerto: recorta una foto a una proporción (ancho:alto) sin achicarla más de lo necesario. */
export interface ImageCropper {
  crop(bytes: Uint8Array, aspect: number): Promise<Uint8Array>;
}

/** Diferencia de proporción que se tolera sin recortar (un par de píxeles de redondeo). */
const TOLERANCE = 0.005;

/** El rectángulo más grande con esa proporción que entra en la foto; null si ya la tiene. */
export function coverBox(width: number, height: number, aspect: number): { width: number; height: number } | null {
  if (Math.abs(width / height - aspect) <= TOLERANCE * aspect) return null;
  return width / height > aspect
    ? { width: Math.round(height * aspect), height }
    : { width, height: Math.round(width / aspect) };
}
