import { describe, expect, it } from "vitest";
import {
  ReportMonthSchema,
  reportChange,
  reportMonthLabel,
  reportMonthOf,
  reportSize,
  shiftReportMonth,
} from "./reports";

describe("reportes", () => {
  it("nombra el mes", () => {
    expect(reportMonthLabel("2026-09")).toBe("septiembre");
    expect(reportMonthLabel("2026-01", true)).toBe("enero de 2026");
  });

  it("el mes se corta en hora de Argentina", () => {
    expect(reportMonthOf(new Date("2026-10-01T02:59:00Z"))).toBe("2026-09");
    expect(reportMonthOf(new Date("2026-10-01T03:00:00Z"))).toBe("2026-10");
  });

  it("corre el mes cruzando el año", () => {
    expect(shiftReportMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftReportMonth("2025-12", 1)).toBe("2026-01");
    expect(shiftReportMonth("2026-10", -11)).toBe("2025-11");
  });

  it("valida el formato", () => {
    expect(ReportMonthSchema.safeParse("2026-09").success).toBe(true);
    expect(ReportMonthSchema.safeParse("2026-13").success).toBe(false);
    expect(ReportMonthSchema.safeParse("2026-9").success).toBe(false);
  });

  it("variación contra el mes anterior", () => {
    expect(reportChange(118, 100)).toBe(18);
    expect(reportChange(50, 100)).toBe(-50);
    expect(reportChange(10, 0)).toBeNull();
  });

  it("nombra el talle", () => {
    expect(reportSize("6")).toBe("Talle 6");
    expect(reportSize("12m")).toBe("Talle 12 m");
    expect(reportSize("Único")).toBe("Talle único");
  });
});
