import { describe, expect, it } from "vitest";
import { barWidth, pickReportMonth, reportMonths } from "./report-view";

describe("reporte del mes", () => {
  it("los meses para elegir, del actual para atrás", () => {
    const months = reportMonths("2026-01", 3);
    expect(months).toEqual([
      { value: "2026-01", label: "Enero 2026 (en curso)" },
      { value: "2025-12", label: "Diciembre 2025" },
      { value: "2025-11", label: "Noviembre 2025" },
    ]);
  });

  it("?mes= solo si es válido y ya empezó", () => {
    expect(pickReportMonth("2026-09", "2026-10")).toBe("2026-09");
    expect(pickReportMonth("2026-10", "2026-10")).toBe("2026-10");
    expect(pickReportMonth("2026-11", "2026-10")).toBeNull();
    expect(pickReportMonth("septiembre", "2026-10")).toBeNull();
    expect(pickReportMonth(undefined, "2026-10")).toBeNull();
  });

  it("barras contra la mayor", () => {
    expect(barWidth(50, 100)).toBe(50);
    expect(barWidth(1, 1000)).toBe(4);
    expect(barWidth(0, 100)).toBe(0);
    expect(barWidth(0, 0)).toBe(0);
  });
});
