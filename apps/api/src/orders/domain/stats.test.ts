import { describe, expect, it } from "vitest";
import { monthKpis, monthlySales, type PaidOrder, weeklySales, weekStart } from "./stats";

const o = (iso: string, pesos: number, email = "a@b.co"): PaidOrder => ({
  paidAt: new Date(iso),
  totalCents: pesos * 100,
  email,
});

describe("estadísticas de ventas (hora de Argentina)", () => {
  it("la semana arranca el lunes a las 0 h de Argentina", () => {
    // martes 13/10 a las 01:30 de Argentina (04:30 UTC)
    expect(weekStart(new Date("2026-10-13T04:30:00Z")).toISOString()).toBe("2026-10-12T03:00:00.000Z");
    // domingo 11/10 a las 23 h de Argentina (lunes 02 h UTC): sigue siendo la semana anterior
    expect(weekStart(new Date("2026-10-12T02:00:00Z")).toISOString()).toBe("2026-10-05T03:00:00.000Z");
  });

  it("ventas por semana y por mes", () => {
    const now = new Date("2026-10-13T15:00:00-03:00");
    const orders = [
      o("2026-10-12T10:00:00-03:00", 40_000),
      o("2026-10-11T23:00:00-03:00", 10_000),
      o("2026-09-15T10:00:00-03:00", 5_000),
    ];
    const weeks = weeklySales(orders, now, 2);
    expect(weeks.map((w) => w.cents / 100)).toEqual([10_000, 40_000]);
    const months = monthlySales(orders, now, 2);
    expect(months.map((m) => m.cents / 100)).toEqual([5_000, 50_000]);
  });

  it("métricas del mes: ventas, clientes que vuelven, ticket y proyección", () => {
    const now = new Date("2026-10-11T00:00:00-03:00"); // pasaron 10 días de 31
    const orders = [
      o("2026-10-02T10:00:00-03:00", 30_000, "lucia@x.co"),
      o("2026-10-05T10:00:00-03:00", 20_000, "lucia@x.co"),
      o("2026-10-06T10:00:00-03:00", 50_000, "carla@x.co"),
      o("2026-09-10T10:00:00-03:00", 40_000, "carla@x.co"),
    ];
    const k = monthKpis(orders, now, new Set(["carla@x.co"]));
    expect(k).toMatchObject({ orders: 3, returning: 2, salesCents: 100_000_00, prevSalesCents: 40_000_00 });
    expect(k.avgTicketCents).toBe(Math.round(100_000_00 / 3));
    expect(k.projectionCents).toBe(Math.round((100_000_00 / 10) * 31));
    expect(monthKpis([], new Date("2026-10-01T05:00:00-03:00"), new Set()).projectionCents).toBeNull();
  });
});
