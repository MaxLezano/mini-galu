import { z } from "zod";
import type { OrderChannel } from "./admin-orders";
import { type Size, sizeLabel } from "./catalog";
import type { Cents } from "./money";

/** Un mes del reporte: "2026-09". */
export const ReportMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido (AAAA-MM)");

const MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

/** "2026-09" → "septiembre" (o "septiembre de 2026" con `year`). Igual en el server y en el navegador. */
export function reportMonthLabel(month: string, year = false): string {
  const [y, m] = month.split("-").map(Number);
  const name = MONTHS[(m ?? 1) - 1] ?? month;
  return year ? `${name} de ${y}` : name;
}

/** El mes de ese momento en Argentina (UTC−3 todo el año): "2026-09". */
export function reportMonthOf(now: Date): string {
  const a = new Date(now.getTime() - 3 * 3_600_000);
  return `${a.getUTCFullYear()}-${String(a.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** El mes `offset` meses antes o después de `month` ("2026-01", -1 → "2025-12"). */
export function shiftReportMonth(month: string, offset: number): string {
  const [y = 0, m = 1] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Cuánto cambió contra el mes anterior, en % redondeado (null si el anterior fue 0: no hay contra qué comparar). */
export const reportChange = (cur: number, prev: number): number | null =>
  prev ? Math.round(((cur - prev) / prev) * 100) : null;

/** "Talle 6" · "Talle 12 m" · "Talle único" (el talle de un renglón viene como texto). */
export const reportSize = (size: string) => (size === "Único" ? "Talle único" : `Talle ${sizeLabel(size as Size)}`);

/** Cuántas prendas trae "Lo más vendido". */
export const REPORT_TOP = 5;

/** Reporte mensual del taller: ventas contra el mes anterior, lo más vendido y los talles agotados. */
export type MonthlyReport = {
  /** "2026-09" */
  month: string;
  /** false: el mes en curso (las ventas llegan hasta hoy). */
  closed: boolean;
  sales: {
    cents: Cents;
    prevCents: Cents;
    orders: number;
    prevOrders: number;
    /** Pedidos de clientes que ya habían comprado antes. */
    returning: number;
    avgTicketCents: Cents;
    prevAvgTicketCents: Cents;
    /** Unidades vendidas (sin las devueltas). */
    units: number;
  };
  /** Por dónde entraron los pedidos, de más a menos vendido. */
  channels: { channel: OrderChannel; orders: number; cents: Cents }[];
  /** Las prendas con más unidades vendidas (con sus talles). */
  top: { slug: string; name: string; units: number; cents: Cents; sizes: { size: string; units: number }[] }[];
  /** Unidades por talle, de más a menos. */
  sizes: { size: string; units: number }[];
  /** Talles publicados sin stock hoy, primero los que tienen más anotados esperando. */
  soldOut: { slug: string; name: string; size: string; waiting: number }[];
};
