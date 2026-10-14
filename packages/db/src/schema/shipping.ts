import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";

/** Envío de un pedido con el correo (Andreani): número de seguimiento y hasta dónde llegó. */
export const shipments = pgTable(
  "shipments",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    carrier: text().notNull(),
    trackingNumber: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    /** Última vez que se consultaron los eventos del correo. */
    checkedAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex().on(t.orderId), uniqueIndex().on(t.carrier, t.trackingNumber)],
);

/** Lo que informa el correo (retirado, en tránsito, entregado…), tal cual se muestra en el seguimiento. */
export const shipmentEvents = pgTable(
  "shipment_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    shipmentId: uuid()
      .notNull()
      .references(() => shipments.id, { onDelete: "cascade" }),
    /** picked_up · hub · in_transit · out_for_delivery · at_branch · delivered */
    code: text().notNull(),
    title: text().notNull(),
    location: text(),
    at: timestamp({ withTimezone: true }).notNull(),
  },
  // el mismo evento puede repetirse (varias visitas): lo que no se repite es el evento en el mismo momento
  (t) => [uniqueIndex().on(t.shipmentId, t.code, t.at), index().on(t.shipmentId, t.at)],
);
