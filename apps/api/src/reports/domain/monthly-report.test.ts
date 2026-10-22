import { describe, expect, it } from "vitest";
import { buildReport, monthOf, monthRange, type ReportOrder } from "./monthly-report";

const order = (o: Partial<ReportOrder> & Pick<ReportOrder, "totalCents" | "email">): ReportOrder => ({
  paidAt: new Date("2026-09-10T15:00:00Z"),
  channel: "web",
  items: [],
  ...o,
});

describe("reporte mensual", () => {
  it("corta los meses en hora de Argentina", () => {
    expect(monthOf(new Date("2026-10-01T02:59:00Z"))).toBe("2026-09");
    expect(monthOf(new Date("2026-10-01T03:00:00Z"))).toBe("2026-10");
    const { from, to } = monthRange("2026-12");
    expect(from.toISOString()).toBe("2026-12-01T03:00:00.000Z");
    expect(to.toISOString()).toBe("2027-01-01T03:00:00.000Z");
  });

  it("suma ventas, cuenta los que vuelven y compara con el mes anterior", () => {
    const r = buildReport({
      month: "2026-09",
      now: new Date("2026-10-01T12:00:00Z"),
      orders: [
        order({ totalCents: 30_000_00, email: "a@x.com", paidAt: new Date("2026-09-02T12:00:00Z") }),
        order({ totalCents: 20_000_00, email: "a@x.com", paidAt: new Date("2026-09-20T12:00:00Z") }),
        order({ totalCents: 10_000_00, email: "b@x.com", channel: "instagram" }),
        order({ totalCents: 45_000_00, email: "c@x.com", channel: "instagram" }),
      ],
      prev: [order({ totalCents: 50_000_00, email: "c@x.com" })],
      earlier: new Set(["c@x.com"]),
      soldOut: [],
    });
    expect(r.closed).toBe(true);
    expect(r.sales).toMatchObject({
      cents: 105_000_00,
      prevCents: 50_000_00,
      orders: 4,
      prevOrders: 1,
      // a@x.com la segunda vez y c@x.com, que compró en agosto
      returning: 2,
      avgTicketCents: 26_250_00,
      prevAvgTicketCents: 50_000_00,
    });
    expect(r.channels).toEqual([
      { channel: "instagram", orders: 2, cents: 55_000_00 },
      { channel: "web", orders: 2, cents: 50_000_00 },
    ]);
  });

  it("lo más vendido por unidades, con sus talles, sin lo devuelto", () => {
    const item = (slug: string, size: string, units: number) => ({
      slug,
      name: slug,
      size,
      units,
      cents: units * 10_000_00,
    });
    const r = buildReport({
      month: "2026-10",
      now: new Date("2026-10-15T12:00:00Z"),
      orders: [
        order({ totalCents: 0, email: "a@x.com", items: [item("samanta", "6", 2), item("maddie", "4", 1)] }),
        order({ totalCents: 0, email: "b@x.com", items: [item("samanta", "8", 1), item("maddie", "4", 0)] }),
        order({ totalCents: 0, email: "c@x.com", items: [item("samanta", "6", 1), item("kira", "2", 1)] }),
      ],
      prev: [],
      earlier: new Set(),
      soldOut: [
        { slug: "kira", name: "Kira", size: "2", waiting: 1 },
        { slug: "samanta", name: "Samanta", size: "10", waiting: 4 },
      ],
    });
    expect(r.closed).toBe(false);
    expect(r.sales.units).toBe(6);
    expect(r.top.map((p) => [p.slug, p.units])).toEqual([
      ["samanta", 4],
      ["maddie", 1],
      ["kira", 1],
    ]);
    expect(r.top[0]?.sizes).toEqual([
      { size: "6", units: 3 },
      { size: "8", units: 1 },
    ]);
    expect(r.top[0]?.cents).toBe(40_000_00);
    expect(r.sizes[0]).toEqual({ size: "6", units: 3 });
    expect(r.soldOut.map((s) => s.slug)).toEqual(["samanta", "kira"]);
  });
});
