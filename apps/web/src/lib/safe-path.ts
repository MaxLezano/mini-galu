/**
 * `?volver=` solo lleva a una página de la tienda (o del panel, con `prefix`). "//otro.com" y "/\otro.com" empiezan
 * con "/" pero el navegador los toma como otro sitio: se descartan (si no, el link de ingresar mandaba afuera).
 */
export function safePath(path: string | null | undefined, fallback: string, prefix = ""): string {
  if (!path?.startsWith("/") || /[\\\s]/.test(path) || path.startsWith("//")) return fallback;
  if (!prefix) return path;
  const rest = path.slice(prefix.length);
  return path.startsWith(prefix) && (rest === "" || /^[/?#]/.test(rest)) ? path : fallback;
}
