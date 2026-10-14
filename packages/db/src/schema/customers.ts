import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { products } from "./catalog";

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
    /** Link público de su lista de cumple (/lista/olivia-7k2q). */
    wishSlug: text().unique(),
    ...stamps,
  },
  (t) => [index().on(t.userId)],
);

/**
 * Lista de cumple de una nena: prendas (en un talle) que la familia puede regalar. Quien compra desde el link la
 * marca como regalada al pagarse; la dueña ve quién regaló qué recién después del cumple.
 */
export const wishItems = pgTable(
  "wish_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid()
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text().notNull(),
    giftedBy: text(),
    giftedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.childId, t.productId, t.size), index().on(t.childId)],
);

/** Favoritos de la cuenta (la web los guarda en el navegador y los sube al ingresar). */
export const favorites = pgTable(
  "favorites",
  {
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.productId] })],
);

/**
 * Notas del taller sobre cada cliente (panel → Clientes). Van por mail porque también se anotan clientes que
 * compraron sin cuenta.
 */
export const customerNotes = pgTable("customer_notes", {
  email: text().primaryKey(),
  note: text().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
