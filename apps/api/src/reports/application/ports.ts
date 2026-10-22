import type { ReportOrder, SoldOutSize } from "../domain/monthly-report";

/** Lo que el reporte lee de los pedidos y del catálogo. */
export interface ReportData {
  /** Pedidos pagados en el rango (sin cancelados ni reembolsados), con lo devuelto ya descontado. */
  paidBetween(from: Date, to: Date): Promise<ReportOrder[]>;
  /** De esos emails, los que ya habían pagado algún pedido antes de `before`. */
  buyersBefore(before: Date, emails: string[]): Promise<Set<string>>;
  /** Talles publicados sin stock, con cuántos anotados siguen esperando. */
  soldOut(): Promise<SoldOutSize[]>;
}
