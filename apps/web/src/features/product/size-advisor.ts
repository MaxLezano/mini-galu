import { GARMENT_SIZES, type Measures, type Size } from "@mini-galu/contracts";

/**
 * Calculadora de talle (mockup producto.html): por altura y por edad, y gana el más grande
 * (los modelos tienen holgura: mejor que le dure).
 */
export function recommendSize(age: number, heightCm: number): Size {
  const byH: Size =
    heightCm < 80
      ? "12m"
      : heightCm < 92
        ? "2"
        : heightCm < 106
          ? "4"
          : heightCm < 118
            ? "6"
            : heightCm < 130
              ? "8"
              : "10";
  const byAge: Size = age <= 1 ? "12m" : (String(Math.min(10, age + (age % 2))) as Size);
  const order = GARMENT_SIZES as readonly Size[];
  return order[Math.max(order.indexOf(byH), order.indexOf(byAge))] ?? "10";
}

/** { largo: 50, axila: 30 } → "Largo 50 · axila 30" */
export function formatMeasures(m: Measures | null | undefined): string {
  if (!m) return "—";
  const parts = (["largo", "axila", "cintura", "ancho"] as const).filter((k) => m[k]).map((k) => `${k} ${m[k]}`);
  const s = parts.join(" · ");
  return s ? s[0]?.toUpperCase() + s.slice(1) : "—";
}
