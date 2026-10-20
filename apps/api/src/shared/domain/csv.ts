/**
 * Una celda de CSV. Lo que empieza con = + - @ (o tab/enter) Excel lo toma como fórmula: un nombre como
 * `=HYPERLINK(…)` cargado en la tienda se ejecutaría al abrir el archivo, así que va con un apóstrofo adelante.
 */
export function csvCell(v: string | number | null, sep = ";"): string {
  let s = v === null ? "" : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return s.includes(sep) || /["\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}
