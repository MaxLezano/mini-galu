import type { Measures } from "@mini-galu/contracts";

/** La calculadora vive en contracts: la usan la ficha y Galú (tool talle_para). */
export { recommendSize } from "@mini-galu/contracts";

/** { largo: 50, axila: 30 } → "Largo 50 · axila 30" */
export function formatMeasures(m: Measures | null | undefined): string {
  if (!m) return "—";
  const parts = (["largo", "axila", "cintura", "ancho"] as const).filter((k) => m[k]).map((k) => `${k} ${m[k]}`);
  const s = parts.join(" · ");
  return s ? s[0]?.toUpperCase() + s.slice(1) : "—";
}
