import type { AdminLaunch, AdminProduct } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { axisLabel, axisSteps, chartStats, lowStock, nextLaunch, pctChange } from "./summary-view";

describe("resumen del día", () => {
  it("eje con pasos redondos y etiquetas cortas", () => {
    expect(axisSteps(541_000_00)).toEqual([0, 200_000_00, 400_000_00, 600_000_00]);
    expect(axisSteps(0)).toHaveLength(4);
    expect(axisLabel(200_000_00)).toBe("200k");
    expect(axisLabel(1_500_000_00)).toBe("1,5M");
  });

  it("mejor período y promedio sin el período en curso", () => {
    const p = (cents: number) => ({ start: "", cents });
    expect(chartStats([p(100), p(300), p(50)])).toEqual({ best: 300, average: 200 });
    expect(pctChange(118, 100)).toBe(18);
    expect(pctChange(5, 0)).toBeNull();
  });

  it("stock para revisar: publicados con 0 o 1, agotados y con espera primero", () => {
    const prod = (slug: string, status: string, variants: [string, number][], waitlist: [string, number][] = []) =>
      ({
        slug,
        name: slug,
        status,
        images: [],
        variants: variants.map(([size, stock]) => ({ size, stock, measures: null })),
        waitlist: waitlist.map(([size, count]) => ({ size, count })),
      }) as unknown as AdminProduct;
    const rows = lowStock([
      prod("a", "published", [
        ["4", 1],
        ["6", 5],
      ]),
      prod("b", "published", [["8", 0]], [["8", 3]]),
      prod("c", "published", [["2", 0]]),
      prod("d", "draft", [["2", 0]]),
    ]);
    expect(rows.map((r) => `${r.slug}${r.size}`)).toEqual(["b8", "c2", "a4"]);
    expect(rows[0]?.waiting).toBe(3);
  });

  it("próximo lanzamiento: el programado más cercano que no salió", () => {
    const l = (id: string, state: string, startsAt: string) => ({ id, state, startsAt }) as AdminLaunch;
    const now = new Date("2026-10-13T12:00:00Z").getTime();
    const list = [
      l("viejo", "scheduled", "2026-10-01T13:00:00Z"),
      l("lejos", "scheduled", "2026-12-01T13:00:00Z"),
      l("cerca", "scheduled", "2026-10-18T13:00:00Z"),
      l("borrador", "draft", "2026-10-15T13:00:00Z"),
    ];
    expect(nextLaunch(list, now)?.id).toBe("cerca");
    expect(nextLaunch([], now)).toBeNull();
  });
});
