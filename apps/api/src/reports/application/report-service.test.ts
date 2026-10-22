import { describe, expect, it } from "vitest";
import { MemoryReportData } from "../testing/in-memory";
import { ReportService } from "./report-service";

const setup = (now = "2026-10-15T12:00:00Z") => {
  const data = new MemoryReportData();
  const paid = (iso: string, email: string, totalCents: number) =>
    data.orders.push({ paidAt: new Date(iso), email, totalCents, channel: "web", items: [] });
  paid("2026-07-20T12:00:00Z", "vuelve@x.com", 10_000_00);
  paid("2026-08-10T12:00:00Z", "a@x.com", 20_000_00);
  paid("2026-09-01T02:00:00Z", "b@x.com", 5_000_00); // 31/8 a las 23 de Argentina
  paid("2026-09-05T12:00:00Z", "vuelve@x.com", 30_000_00);
  paid("2026-10-02T12:00:00Z", "c@x.com", 40_000_00);
  data.sold = [{ slug: "samanta", name: "Samanta", size: "10", waiting: 2 }];
  return { data, reports: new ReportService(data, () => new Date(now)) };
};

describe("ReportService", () => {
  it("sin mes, el último cerrado contra el anterior", async () => {
    const { reports } = setup();
    const r = await reports.monthly();
    expect(r.month).toBe("2026-09");
    expect(r.closed).toBe(true);
    expect(r.sales).toMatchObject({ cents: 30_000_00, orders: 1, returning: 1, prevCents: 25_000_00, prevOrders: 2 });
    expect(r.soldOut).toHaveLength(1);
  });

  it("el mes en curso va hasta hoy", async () => {
    const { reports } = setup();
    const r = await reports.monthly("2026-10");
    expect(r.closed).toBe(false);
    expect(r.sales.cents).toBe(40_000_00);
  });

  it("un mes que no empezó no se arma", async () => {
    const { reports } = setup();
    await expect(reports.monthly("2026-11")).rejects.toThrow("todavía no empezó");
  });

  it("el día 1 a la madrugada el último cerrado es el que terminó", () => {
    expect(setup("2026-10-01T03:30:00Z").reports.lastClosed()).toBe("2026-09");
    expect(setup("2026-10-01T02:30:00Z").reports.lastClosed()).toBe("2026-08");
  });
});
