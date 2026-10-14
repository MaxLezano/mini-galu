/** Una sucursal del correo donde el cliente puede retirar. */
export type Branch = {
  id: string;
  name: string;
  street: string;
  number: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  /** Códigos postales que atiende (la sucursal "de" un CP). */
  servesPostalCodes: string[];
};

const KM = (a: Branch, b: Branch) => {
  if (a.lat === null || a.lng === null || b.lat === null || b.lng === null) return Number.POSITIVE_INFINITY;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};

const digits = (cp: string) => Number(cp.replace(/\D/g, "").slice(0, 4)) || 0;

/**
 * Sucursales para un código postal: primero la que lo atiende y después las más cercanas a ella.
 * Si ninguna lo atiende, se toma como referencia la de código postal más parecido (en Argentina los CP van por zona).
 */
export function branchesFor(all: Branch[], postalCode: string, limit = 6): Branch[] {
  const cp = String(digits(postalCode));
  const serving = all.filter((b) => b.servesPostalCodes.includes(cp) || digits(b.postalCode) === Number(cp));
  const anchor =
    serving[0] ??
    [...all].sort(
      (a, b) => Math.abs(digits(a.postalCode) - Number(cp)) - Math.abs(digits(b.postalCode) - Number(cp)),
    )[0];
  if (!anchor) return [];
  const rest = all.filter((b) => !serving.includes(b) && b !== anchor).sort((a, b) => KM(anchor, a) - KM(anchor, b));
  return [...(serving.length ? serving : [anchor]), ...rest].slice(0, limit);
}

/** "PALERMO (AV SCALABRINI ORTIZ)" → "Palermo (Av Scalabrini Ortiz)" */
export function branchName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/(^|[\s(-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
}

export const branchAddress = (b: Pick<Branch, "street" | "number" | "city">) =>
  `${b.street} ${b.number}`.trim() + (b.city ? ` · ${branchName(b.city)}` : "");
