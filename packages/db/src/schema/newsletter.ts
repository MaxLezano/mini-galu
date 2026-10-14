import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** "Cartas del taller": quienes se suscribieron (footer, registro, cuenta). La baja deja la fila con fecha. */
export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    /** footer · cuenta · checkout */
    source: text().notNull(),
    /** Para el link de baja de cada carta (sin cuenta). */
    token: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    unsubscribedAt: timestamp({ withTimezone: true }),
  },
  (t) => [uniqueIndex().on(t.email), uniqueIndex().on(t.token)],
);

/** Cartas que se mandaron desde el panel. */
export const newsletterLetters = pgTable("newsletter_letters", {
  id: uuid().primaryKey().defaultRandom(),
  subject: text().notNull(),
  body: text().notNull(),
  recipients: integer().notNull().default(0),
  sentAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
