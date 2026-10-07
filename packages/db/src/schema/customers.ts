import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

const stamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/**
 * Direcciones de la clienta: separadas por campo porque Andreani las pide así (calle, altura, CP, provincia)
 * y una clienta puede tener varias ("Casa", "Lo de la abuela"). Una sola es la predeterminada.
 */
export const addresses = pgTable(
  "addresses",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    label: text().notNull().default("Casa"),
    street: text().notNull(),
    number: varchar({ length: 10 }).notNull(),
    /** Piso / depto. */
    unit: varchar({ length: 20 }),
    city: text().notNull(),
    province: text().notNull(),
    postalCode: varchar({ length: 8 }).notNull(),
    country: varchar({ length: 2 }).notNull().default("AR"),
    /** Observaciones para quien entrega: "casa blanca con portón negro en la esquina". */
    notes: text(),
    isDefault: boolean().notNull().default(false),
    ...stamps,
  },
  (t) => [index().on(t.userId), uniqueIndex("addresses_one_default").on(t.userId).where(sql`${t.isDefault}`)],
);

/** "Mis nenas": filtran el catálogo por su talle y disparan el aviso de cumple (mockup cuenta.html). */
export const children = pgTable(
  "children",
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text().notNull(),
    birthday: date(),
    size: text(),
    heightCm: smallint(),
    ...stamps,
  },
  (t) => [index().on(t.userId)],
);
