import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { orders } from "./orders";

/* ------------------------------------------------------------------ facturación electrónica (ARCA) */

export const invoiceKind = pgEnum("invoice_kind", ["factura", "nota_credito"]);
export const invoiceStatus = pgEnum("invoice_status", ["pendiente", "emitida", "error", "anulada"]);

/** Lo que se imprime en el comprobante, congelado al crearlo (si después cambian los datos de la tienda, no cambia). */
export type InvoiceData = {
  orderNumber: string;
  issuer: { name: string; cuit: string; address: string; iibb: string; activitiesSince: string };
  receptor: { name: string; email: string };
  lines: { description: string; qty: number; unitCents: number; totalCents: number }[];
  /** "Tarjeta de crédito · 3 cuotas" */
  payment: string | null;
};

/**
 * Facturas C y notas de crédito C de los pedidos (una factura por pedido y una nota por cada devolución: las parciales
 * y el reintegro de lo que queda).
 */
export const invoices = pgTable(
  "invoices",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id),
    kind: invoiceKind().notNull(),
    status: invoiceStatus().notNull().default("pendiente"),
    /** Código de ARCA: 11 factura C, 13 nota de crédito C. */
    cbteType: integer().notNull(),
    pointOfSale: integer().notNull(),
    /** Se guarda antes de pedir el CAE: si ARCA no contesta, al reintentar se consulta si ese número quedó emitido. */
    number: integer(),
    cae: varchar({ length: 14 }),
    /** AAAA-MM-DD */
    caeExpiresOn: varchar({ length: 10 }),
    issuedOn: varchar({ length: 10 }),
    totalCents: integer().notNull(),
    data: jsonb().$type<InvoiceData>().notNull(),
    /** Nota de crédito: la factura que anula. */
    associatedId: uuid(),
    /** Nota de crédito: qué devolución anula ("total" o el id de una devolución parcial). */
    refundKey: text(),
    /** Emitida con el emisor simulado (local y CI): sin validez fiscal. */
    simulated: boolean().notNull().default(false),
    attempts: integer().notNull().default(0),
    lastError: text(),
    nextAttemptAt: timestamp({ withTimezone: true }),
    /** Cuándo le llegó al cliente (adjunta al mail del pago o del reintegro, o sola si se emitió después). */
    mailedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("invoices_one_factura").on(t.orderId).where(sql`${t.kind} = 'factura'`),
    uniqueIndex("invoices_one_credit_per_refund").on(t.orderId, t.refundKey),
    uniqueIndex("invoices_number")
      .on(t.simulated, t.cbteType, t.pointOfSale, t.number)
      .where(sql`${t.status} = 'emitida'`),
    index("invoices_due").on(t.nextAttemptAt).where(sql`${t.status} in ('pendiente', 'error')`),
  ],
);

/** Ticket de acceso de ARCA (WSAA): dura 12 h y no se puede pedir otro mientras siga vigente. */
export const arcaTokens = pgTable("arca_tokens", {
  service: text().primaryKey(),
  token: text().notNull(),
  sign: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
});
