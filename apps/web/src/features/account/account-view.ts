/** Edad cumplida a una fecha ("2021-11-14" → 4). */
export function ageOf(birthday: string, now: Date): number {
  const [y, m, d] = birthday.split("-").map(Number) as [number, number, number];
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return Math.max(0, age);
}

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "14 de noviembre" */
export function birthdayLabel(birthday: string): string {
  const [, m, d] = birthday.split("-").map(Number) as [number, number, number];
  return `${d} de ${MONTHS[m - 1]}`;
}

/** Días que faltan para el próximo cumple (0 = hoy). */
export function daysToBirthday(birthday: string, now: Date): number {
  const [, m, d] = birthday.split("-").map(Number) as [number, number, number];
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** "mayo 2026" */
export function memberSince(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
