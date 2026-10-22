import type { ReportData } from "../application/ports";
import type { ReportOrder, SoldOutSize } from "../domain/monthly-report";

/** Pedidos pagados y talles agotados en memoria. */
export class MemoryReportData implements ReportData {
  orders: ReportOrder[] = [];
  sold: SoldOutSize[] = [];

  async paidBetween(from: Date, to: Date) {
    return this.orders.filter((o) => o.paidAt >= from && o.paidAt < to);
  }

  async buyersBefore(before: Date, emails: string[]) {
    return new Set(this.orders.filter((o) => o.paidAt < before && emails.includes(o.email)).map((o) => o.email));
  }

  async soldOut() {
    return this.sold;
  }
}
