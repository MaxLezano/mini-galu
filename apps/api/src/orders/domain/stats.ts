/** Argentina es UTC−3 todo el año: las fechas se cortan en hora local sin depender del huso del servidor. */
const AR = -3 * 3_600_000;

const ar = (d: Date) => new Date(d.getTime() + AR);
const fromAr = (y: number, m: number, day: number) => new Date(Date.UTC(y, m, day) - AR);

export type PaidOrder = { totalCents: number; paidAt: Date; email: string };

/** Lunes 00:00 (hora AR) de la semana de `d`. */
export function weekStart(d: Date): Date {
  const a = ar(d);
  const dow = (a.getUTCDay() + 6) % 7; // lunes = 0
  return fromAr(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate() - dow);
}

/** Día 1 00:00 (hora AR) del mes de `d`, corrido `offset` meses. */
export function monthStart(d: Date, offset = 0): Date {
  const a = ar(d);
  return fromAr(a.getUTCFullYear(), a.getUTCMonth() + offset, 1);
}

const sum = (list: PaidOrder[]) => list.reduce((a, o) => a + o.totalCents, 0);
const between = (list: PaidOrder[], from: Date, to: Date) =>
  list.filter((o) => o.paidAt.getTime() >= from.getTime() && o.paidAt.getTime() < to.getTime());

/** Ventas de las últimas `n` semanas (la actual incluida), de la más vieja a la más nueva. */
export function weeklySales(orders: PaidOrder[], now: Date, n = 8): { start: Date; cents: number }[] {
  const current = weekStart(now);
  return Array.from({ length: n }, (_, k) => {
    const start = new Date(current.getTime() - (n - 1 - k) * 7 * 86_400_000);
    const end = new Date(start.getTime() + 7 * 86_400_000);
    return { start, cents: sum(between(orders, start, end)) };
  });
}

/** Ventas de los últimos `n` meses (el actual incluido). */
export function monthlySales(orders: PaidOrder[], now: Date, n = 12): { start: Date; cents: number }[] {
  return Array.from({ length: n }, (_, k) => {
    const start = monthStart(now, k - (n - 1));
    return { start, cents: sum(between(orders, start, monthStart(now, k - (n - 1) + 1))) };
  });
}

export type MonthKpis = {
  salesCents: number;
  prevSalesCents: number;
  orders: number;
  /** Pedidos del mes de clientes que ya habían comprado antes. */
  returning: number;
  avgTicketCents: number;
  prevAvgTicketCents: number;
  /** Lo vendido en el mes al ritmo de los días que pasaron (null el primer día: no hay ritmo todavía). */
  projectionCents: number | null;
};

/** Métricas del mes en curso contra el anterior. `earlierEmails`: quienes compraron antes del mes. */
export function monthKpis(orders: PaidOrder[], now: Date, earlierEmails: Set<string>): MonthKpis {
  const start = monthStart(now);
  const month = between(orders, start, new Date(now.getTime() + 1));
  const prev = between(orders, monthStart(now, -1), start);
  const a = ar(now);
  const daysInMonth = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 0)).getUTCDate();
  const elapsedDays = (now.getTime() - start.getTime()) / 86_400_000;
  const salesCents = sum(month);
  const seen = new Set<string>();
  let returning = 0;
  for (const o of [...month].sort((x, y) => x.paidAt.getTime() - y.paidAt.getTime())) {
    if (earlierEmails.has(o.email) || seen.has(o.email)) returning++;
    seen.add(o.email);
  }
  return {
    salesCents,
    prevSalesCents: sum(prev),
    orders: month.length,
    returning,
    avgTicketCents: month.length ? Math.round(salesCents / month.length) : 0,
    prevAvgTicketCents: prev.length ? Math.round(sum(prev) / prev.length) : 0,
    projectionCents: elapsedDays >= 1 ? Math.round((salesCents / elapsedDays) * daysInMonth) : null,
  };
}
