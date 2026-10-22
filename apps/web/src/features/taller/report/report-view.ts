import { ReportMonthSchema, reportMonthLabel, shiftReportMonth } from "@mini-galu/contracts";

/** Los últimos `n` meses para elegir, del actual (en curso) para atrás: "Octubre 2026 (en curso)". */
export function reportMonths(current: string, n = 12): { value: string; label: string }[] {
  return Array.from({ length: n }, (_, k) => {
    const value = shiftReportMonth(current, -k);
    const name = reportMonthLabel(value, true).replace(" de ", " ");
    return { value, label: `${name.charAt(0).toUpperCase()}${name.slice(1)}${k === 0 ? " (en curso)" : ""}` };
  });
}

/** El mes de `?mes=` si es válido y ya empezó; si no, null (el reporte del último mes cerrado). */
export function pickReportMonth(param: unknown, current: string): string | null {
  const m = ReportMonthSchema.safeParse(param);
  return m.success && m.data <= current ? m.data : null;
}

/** Ancho de una barra contra la mayor, en % (lo que vendió algo se ve aunque sea poco). */
export const barWidth = (value: number, max: number) =>
  max > 0 && value > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
