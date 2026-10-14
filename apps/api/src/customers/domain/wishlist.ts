/** Link de la lista de cumple: "Olivia" → "olivia-7k2q" (el sufijo evita que se adivinen las listas). */
export function wishSlug(name: string, random: string): string {
  const base =
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 30) || "lista";
  return `${base}-${random}`;
}

/**
 * Quién regaló qué se muestra recién después del cumple: si se regaló antes del cumple siguiente al regalo y ese
 * cumple ya pasó. Sin fecha de cumple, se muestra a los 30 días del regalo.
 */
export function revealGiver(birthday: string | null, giftedAt: Date, now: Date): boolean {
  if (!birthday) return now.getTime() - giftedAt.getTime() > 30 * 86_400_000;
  const [, m, d] = birthday.split("-").map(Number) as [number, number, number];
  let next = new Date(giftedAt.getFullYear(), m - 1, d);
  if (next < new Date(giftedAt.getFullYear(), giftedAt.getMonth(), giftedAt.getDate()))
    next = new Date(giftedAt.getFullYear() + 1, m - 1, d);
  return now >= next;
}
