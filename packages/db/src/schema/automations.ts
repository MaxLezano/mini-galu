import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";

/**
 * Registro de "lo que se hizo solo" (admin-automatizaciones.html → Registro): cada aviso que mandó una regla.
 * `subjectKey` evita repetir un aviso (ej. stock bajo del mismo talle); `contact` + `productSlug` permiten medir
 * las ventas que vinieron de un aviso de talle.
 */
export const automationRuns = pgTable(
  "automation_runs",
  {
    id: uuid().primaryKey().defaultRandom(),
    rule: text().notNull(),
    subject: text().notNull(),
    detail: text().notNull(),
    /** mail · whatsapp · panel */
    channel: text().notNull(),
    /** ok · warn */
    status: text().notNull(),
    subjectKey: text(),
    orderId: uuid().references(() => orders.id, { onDelete: "set null" }),
    contact: text(),
    productSlug: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.createdAt), index().on(t.rule, t.subjectKey)],
);
