import type { AdminLaunch, AdminProduct, SalesPoint } from "@mini-galu/contracts";

export type ChartMode = "semanas" | "meses";

/** Techo "redondo" del eje (1, 2, 2,5 o 5 × 10ⁿ por paso) con 3 pasos, como el 0–200k–400k–600k del mockup. */
export function axisSteps(maxCents: number, steps = 3): number[] {
  if (maxCents <= 0) return Array.from({ length: steps + 1 }, (_, i) => i * 100_000_00);
  const raw = maxCents / steps;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * mag >= raw) ?? 10) * mag;
  return Array.from({ length: steps + 1 }, (_, i) => i * step);
}

/** Etiqueta corta del eje: "200k", "1,5M" (en pesos). */
export function axisLabel(cents: number): string {
  const pesos = cents / 100;
  if (pesos >= 1_000_000) return `${(pesos / 1_000_000).toLocaleString("es-AR", { maximumFractionDigits: 1 })}M`;
  return `${Math.round(pesos / 1000)}k`;
}

/** Mejor período y promedio de los períodos ya cerrados (el actual está a medias y bajaría el promedio). */
export function chartStats(points: SalesPoint[]): { best: number; average: number } {
  const closed = points.slice(0, -1);
  return {
    best: Math.max(0, ...points.map((p) => p.cents)),
    average: closed.length ? Math.round(closed.reduce((a, p) => a + p.cents, 0) / closed.length) : 0,
  };
}

/** Variación porcentual redondeada; null si el período anterior no tuvo ventas. */
export const pctChange = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null);

export const greeting = (hour: number) => (hour < 13 ? "Buen día" : hour < 20 ? "Buenas tardes" : "Buenas noches");

export type LowStockRow = {
  slug: string;
  name: string;
  imageUrl: string | null;
  size: string;
  stock: number;
  waiting: number;
};

/** Talles publicados con 1 o 0 unidades: primero los agotados y los que tienen más gente esperando. */
export function lowStock(products: AdminProduct[], limit = 6): LowStockRow[] {
  return products
    .filter((p) => p.status === "published")
    .flatMap((p) =>
      p.variants
        .filter((v) => v.stock <= 1)
        .map((v) => ({
          slug: p.slug,
          name: p.name,
          imageUrl: p.images[0]?.url ?? null,
          size: v.size,
          stock: v.stock,
          waiting: p.waitlist.find((w) => w.size === v.size)?.count ?? 0,
        })),
    )
    .sort((a, b) => a.stock - b.stock || b.waiting - a.waiting)
    .slice(0, limit);
}

/** El lanzamiento programado más cercano que todavía no salió. */
export function nextLaunch(launches: AdminLaunch[], now: number): AdminLaunch | null {
  return (
    launches
      .filter((l) => l.state === "scheduled" && new Date(l.startsAt).getTime() > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
  );
}
