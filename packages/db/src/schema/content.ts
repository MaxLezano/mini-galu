import {
  boolean,
  date,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { collections, contactChannel, products } from "./catalog";

export const launchStatus = pgEnum("launch_status", ["draft", "scheduled"]);

export const launches = pgTable("launches", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  collectionId: uuid().references(() => collections.id),
  startsAt: timestamp({ withTimezone: true }).notNull(),
  teaser: text().notNull(),
  coverPath: text(),
  coverNote: text(),
  /** Se muestra en la home con cuenta regresiva. */
  showCountdown: boolean().notNull().default(true),
  /** Avisar a los anotados 1 hora antes (lo manda la automatización, fase 6). */
  notifyBefore: boolean().notNull().default(true),
  /** Publicar las prendas solas a la hora indicada (LaunchScheduler). */
  autoPublish: boolean().notNull().default(true),
  /** Cuándo se publicaron las prendas (null = todavía no). */
  publishedAt: timestamp({ withTimezone: true }),
  /** Texto sugerido para redes (admin-lanzamientos). */
  socialText: text(),
  status: launchStatus().notNull().default("draft"),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/** Prendas que salen con el lanzamiento (en borrador se ven como "Próximamente"). */
export const launchProducts = pgTable(
  "launch_products",
  {
    launchId: uuid()
      .notNull()
      .references(() => launches.id, { onDelete: "cascade" }),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    position: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.launchId, t.productId] })],
);

export const launchSignups = pgTable(
  "launch_signups",
  {
    id: uuid().primaryKey().defaultRandom(),
    launchId: uuid()
      .notNull()
      .references(() => launches.id, { onDelete: "cascade" }),
    channel: contactChannel().notNull(),
    contact: text().notNull(),
    notifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.launchId, t.contact)],
);

/**
 * Visitas al adelanto (la sección de la home o la ficha de una prenda que todavía no salió): una por visitante y día.
 * Sin cookies ni IP: `visitor` es un hash de IP + navegador + día con un secreto del servidor (como Plausible).
 */
export const launchVisits = pgTable(
  "launch_visits",
  {
    launchId: uuid()
      .notNull()
      .references(() => launches.id, { onDelete: "cascade" }),
    day: date().notNull(),
    visitor: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.launchId, t.day, t.visitor] })],
);

/** Bloques editables desde el panel (portada, anuncios, carrusel). key → JSON validado con contracts. */
export const contentBlocks = pgTable("content_blocks", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
