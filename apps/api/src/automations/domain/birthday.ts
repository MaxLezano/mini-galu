const DAY = 86_400_000;
/** Argentina no tiene horario de verano: UTC−3 todo el año. */
const AR_OFFSET = 3 * 3_600_000;

/** Fecha y hora de Argentina de un instante. */
export function argentinaNow(now: Date) {
  const ar = new Date(now.getTime() - AR_OFFSET);
  return { year: ar.getUTCFullYear(), month: ar.getUTCMonth(), day: ar.getUTCDate(), hour: ar.getUTCHours() };
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/**
 * Cuántos días faltan para el próximo cumple (0 = hoy) y de qué año es ese cumple.
 * `birthday` es "AAAA-MM-DD"; quien nació un 29 de febrero lo festeja el 28 en los años no bisiestos.
 */
export function nextBirthday(birthday: string, now: Date): { days: number; year: number } {
  const [, m, d] = birthday.split("-").map(Number) as [number, number, number];
  const today = argentinaNow(now);
  const on = (y: number) => Date.UTC(y, m - 1, m === 2 && d === 29 && !isLeap(y) ? 28 : d);
  const start = Date.UTC(today.year, today.month, today.day);
  const year = on(today.year) >= start ? today.year : today.year + 1;
  return { days: Math.round((on(year) - start) / DAY), year };
}
