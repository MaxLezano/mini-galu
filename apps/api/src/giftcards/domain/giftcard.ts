/** Sin letras que se confunden (0/O, 1/I/L): el código se dicta por teléfono o se copia de un WhatsApp. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** "GALU-7KQ2-M9XA": 8 caracteres al azar (31⁸ ≈ 850 mil millones, imposible de adivinar probando). */
export function giftcardCode(randomBytes: Uint8Array): string {
  const chars = [...randomBytes.slice(0, 8)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  return `GALU-${chars.slice(0, 4)}-${chars.slice(4, 8)}`;
}

/** Lo que escribe el cliente ("galu 7kq2 m9xa") → "GALU-7KQ2-M9XA". */
export function normalizeCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("GALU") ? raw.slice(4) : raw;
  return body.length === 8 ? `GALU-${body.slice(0, 4)}-${body.slice(4)}` : input.trim().toUpperCase();
}

/** Vale 6 meses desde que se activa. */
export function expiresAt(from: Date): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 6);
  return d;
}

/** "Ese día a las 9" (Argentina, UTC−3) para una fecha "YYYY-MM-DD". */
export function deliverAt(day: string | null): Date | null {
  return day ? new Date(`${day}T09:00:00-03:00`) : null;
}

/** ¿Se puede usar? */
export function usable(
  card: { status: string; balanceCents: number; expiresAt: Date | null },
  now: Date,
): string | null {
  if (card.status !== "activa") return "Esa gift card todavía no está activa";
  if (card.expiresAt && card.expiresAt < now) return "Esa gift card venció";
  if (card.balanceCents <= 0) return "Esa gift card ya no tiene saldo";
  return null;
}
