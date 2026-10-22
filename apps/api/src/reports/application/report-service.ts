import { type MonthlyReport, shiftReportMonth } from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";
import { buildReport, monthOf, monthRange } from "../domain/monthly-report";
import type { ReportData } from "./ports";

/** Reporte mensual del taller: lo ve el panel y lo manda por mail la regla "Reporte del mes" el día 1. */
export class ReportService {
  constructor(
    private readonly data: ReportData,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  /** El último mes cerrado ("2026-09" durante octubre). */
  lastClosed(): string {
    return shiftReportMonth(monthOf(this.clock()), -1);
  }

  /** Sin mes, el último cerrado. El mes en curso se puede ver (va hasta hoy); uno que no empezó, no. */
  async monthly(month = this.lastClosed()): Promise<MonthlyReport> {
    const now = this.clock();
    if (month > monthOf(now)) throw new ValidationError("Ese mes todavía no empezó");
    const { from, to } = monthRange(month);
    const [orders, prev, soldOut] = await Promise.all([
      this.data.paidBetween(from, to),
      this.data.paidBetween(monthRange(shiftReportMonth(month, -1)).from, from),
      this.data.soldOut(),
    ]);
    const earlier = await this.data.buyersBefore(from, [...new Set(orders.map((o) => o.email))]);
    return buildReport({ month, now, orders, prev, earlier, soldOut });
  }
}
