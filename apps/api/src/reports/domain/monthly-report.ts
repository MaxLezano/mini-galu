import { type MonthlyReport, type OrderChannel, REPORT_TOP, reportMonthOf } from "@mini-galu/contracts";

/** Argentina es UTC−3 todo el año: los meses se cortan en hora local sin depender del huso del servidor. */
const AR = -3 * 3_600_000;

/** Un pedido pagado del mes, con lo que quedó de cada renglón después de las devoluciones. */
export type ReportOrder = {
  /** Lo cobrado menos lo devuelto. */
  totalCents: number;
  paidAt: Date;
  email: string;
  channel: OrderChannel;
  items: { slug: string; name: string; size: string; units: number; cents: number }[];
};

export type SoldOutSize = MonthlyReport["soldOut"][number];

/** "2026-09" del momento `now` (hora AR). */
export const monthOf = reportMonthOf;

/** Desde el día 1 00:00 hasta el día 1 del mes siguiente (hora AR). */
export function monthRange(month: string): { from: Date; to: Date } {
  const [y = 0, m = 1] = month.split("-").map(Number);
  return { from: new Date(Date.UTC(y, m - 1, 1) - AR), to: new Date(Date.UTC(y, m, 1) - AR) };
}

const byUnits = <T extends { units: number }>(a: T, b: T) => b.units - a.units;

/** Suma unidades por clave, de más a menos (los empates, en el orden en que aparecieron). */
function tally<T extends { units: number }>(rows: T[], key: (r: T) => string): T[] {
  const m = new Map<string, T>();
  for (const r of rows) {
    const k = key(r);
    const prev = m.get(k);
    m.set(k, prev ? { ...prev, units: prev.units + r.units } : { ...r });
  }
  return [...m.values()].sort(byUnits);
}

/**
 * Arma el reporte de un mes. `prev`: los pagados del mes anterior; `earlier`: quienes compraron antes del mes (para
 * contar los que vuelven). Con el mes en curso, las ventas llegan hasta hoy y se comparan con el mes anterior entero.
 */
export function buildReport(r: {
  month: string;
  now: Date;
  orders: ReportOrder[];
  prev: ReportOrder[];
  earlier: Set<string>;
  soldOut: SoldOutSize[];
}): MonthlyReport {
  const sum = (list: ReportOrder[]) => list.reduce((a, o) => a + o.totalCents, 0);
  const avg = (list: ReportOrder[]) => (list.length ? Math.round(sum(list) / list.length) : 0);

  const seen = new Set<string>();
  let returning = 0;
  for (const o of [...r.orders].sort((a, b) => a.paidAt.getTime() - b.paidAt.getTime())) {
    if (r.earlier.has(o.email) || seen.has(o.email)) returning++;
    seen.add(o.email);
  }

  const channels = new Map<OrderChannel, { orders: number; cents: number }>();
  for (const o of r.orders) {
    const c = channels.get(o.channel) ?? { orders: 0, cents: 0 };
    channels.set(o.channel, { orders: c.orders + 1, cents: c.cents + o.totalCents });
  }

  const lines = r.orders.flatMap((o) => o.items).filter((i) => i.units > 0);
  const products = new Map<string, { name: string; units: number; cents: number; lines: typeof lines }>();
  for (const i of lines) {
    const p = products.get(i.slug) ?? { name: i.name, units: 0, cents: 0, lines: [] };
    products.set(i.slug, { ...p, units: p.units + i.units, cents: p.cents + i.cents, lines: [...p.lines, i] });
  }

  return {
    month: r.month,
    closed: monthRange(r.month).to.getTime() <= r.now.getTime(),
    sales: {
      cents: sum(r.orders),
      prevCents: sum(r.prev),
      orders: r.orders.length,
      prevOrders: r.prev.length,
      returning,
      avgTicketCents: avg(r.orders),
      prevAvgTicketCents: avg(r.prev),
      units: lines.reduce((a, i) => a + i.units, 0),
    },
    channels: [...channels]
      .map(([channel, c]) => ({ channel, ...c }))
      .sort((a, b) => b.cents - a.cents || b.orders - a.orders),
    top: [...products]
      .map(([slug, p]) => ({
        slug,
        name: p.name,
        units: p.units,
        cents: p.cents,
        sizes: tally(
          p.lines.map((l) => ({ size: l.size, units: l.units })),
          (l) => l.size,
        ),
      }))
      .sort((a, b) => b.units - a.units || b.cents - a.cents)
      .slice(0, REPORT_TOP),
    sizes: tally(
      lines.map((l) => ({ size: l.size, units: l.units })),
      (l) => l.size,
    ),
    soldOut: [...r.soldOut].sort((a, b) => b.waiting - a.waiting),
  };
}
