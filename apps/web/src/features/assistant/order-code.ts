/**
 * El número de pedido que viene en el mensaje ("¿dónde está el MG-1042?", "mg 1042", "#1042" o solo "1042" después
 * de que Galú lo pidió) o el de Andreani (10 dígitos o más, sin espacios). null si no hay ninguno.
 */
export function orderCodeIn(raw: string): string | null {
  const t = raw.trim();
  const mg = /(?:\bmg|#)[\s-]*(\d{4,9})\b/i.exec(t) ?? /^#?(\d{4,9})[\s.?!]*$/.exec(t);
  if (mg) return `MG-${mg[1]}`;
  return /\b\d{10,20}\b/.exec(t)?.[0] ?? null;
}
