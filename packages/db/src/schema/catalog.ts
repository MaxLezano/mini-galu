import type { Measures } from "@mini-galu/contracts";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { orderItems } from "./orders";

const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const productStatus = pgEnum("product_status", ["draft", "published"]);
export const contactChannel = pgEnum("contact_channel", ["whatsapp", "email"]);
export const reviewFit = pgEnum("review_fit", ["justo", "grande", "chico"]);
/** pendiente: la dejó un cliente y Gaby todavía no la vio · publicada: se ve en la ficha (y cuenta en las estrellas). */
export const reviewStatus = pgEnum("review_status", ["pendiente", "publicada", "oculta"]);

export const collections = pgTable("collections", {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  /** Nombre largo para menús ("Fiestas y ceremonias"). */
  label: text().notNull(),
  tagline: text(),
  coverPath: text(),
  position: integer().notNull().default(0),
  ...timestamps,
});

export const products = pgTable(
  "products",
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    name: text().notNull(),
    description: text().notNull(),
    collectionId: uuid()
      .notNull()
      .references(() => collections.id),
    colorName: text().notNull(),
    colorHex: text().notNull(),
    fabric: text().notNull(),
    care: text().notNull(),
    occasions: text().array().notNull().default(sql`'{}'::text[]`),
    priceCents: integer().notNull(),
    compareAtCents: integer(),
    /** Etiqueta de prenda: "Nuevo", "Incluye moño"… */
    tag: text(),
    isAccessory: boolean().notNull().default(false),
    status: productStatus().notNull().default("draft"),
    /** Contador desnormalizado; lo incrementa orders al aprobarse un pago. */
    unitsSold: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index().on(t.collectionId),
    index().on(t.status),
    check("price_positive", sql`${t.priceCents} >= 0`),
    check("compare_at_gt_price", sql`${t.compareAtCents} IS NULL OR ${t.compareAtCents} > ${t.priceCents}`),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** Ruta relativa dentro del ImageStorage (ej. products/maddie-1.webp). */
    path: text().notNull(),
    alt: text().notNull().default(""),
    position: integer().notNull().default(0),
  },
  (t) => [index().on(t.productId, t.position)],
);

export const variants = pgTable(
  "variants",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text().notNull(),
    stock: integer().notNull().default(0),
    measures: jsonb().$type<Measures>(),
    position: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.productId, t.size), check("stock_non_negative", sql`${t.stock} >= 0`)],
);

/** "Avisame cuando vuelva": por talle, o por modelo (size null) si todavía no salió. */
export const waitlistEntries = pgTable(
  "waitlist_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    size: text(),
    channel: contactChannel().notNull(),
    contact: text().notNull(),
    notifiedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.productId, t.size),
    uniqueIndex().on(t.productId, t.size, t.contact).where(sql`${t.notifiedAt} IS NULL`),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid().primaryKey().defaultRandom(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    author: text().notNull(),
    city: text(),
    rating: smallint().notNull(),
    /** Las que dejan los clientes no llevan título (el form pide estrellas, texto y foto). */
    title: text().notNull().default(""),
    body: text().notNull(),
    size: text(),
    fit: reviewFit(),
    /** Foto que subió el cliente (ImageStorage). */
    photoPath: text(),
    status: reviewStatus().notNull().default("pendiente"),
    /** Gaby la eligió para "Lo que dicen las familias" (la cinta de la home). */
    featured: boolean().notNull().default(false),
    /** La prenda del pedido que se reseña (una reseña por prenda). Las del seed no tienen. */
    orderItemId: uuid().references(() => orderItems.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.productId),
    index().on(t.status),
    uniqueIndex().on(t.orderItemId),
    check("rating_range", sql`${t.rating} BETWEEN 1 AND 5`),
  ],
);
