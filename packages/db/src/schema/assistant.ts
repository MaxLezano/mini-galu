import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";

/**
 * Charlas con Galú (admin-galu.html → Conversaciones). El id lo genera el navegador al primer mensaje.
 * Quién habló: la cuenta (`userId`) o la bolsa de invitada (`cartToken`), para saber si terminó en una compra.
 */
export const assistantConversations = pgTable(
  "assistant_conversations",
  {
    id: uuid().primaryKey(),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    cartToken: text(),
    /** La ficha desde la que se abrió Galú. */
    productSlug: text(),
    startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.lastAt)],
);

export const assistantMessages = pgTable(
  "assistant_messages",
  {
    id: uuid().primaryKey().defaultRandom(),
    conversationId: uuid()
      .notNull()
      .references(() => assistantConversations.id, { onDelete: "cascade" }),
    /** user · assistant */
    role: text().notNull(),
    text: text().notNull(),
    /** Galú no supo responder: la pregunta, resumida por el modelo (va a "Enseñale"). */
    unanswered: text(),
    /** Galú anotó un aviso de talle en la lista de espera: "Vestido Samanta · talle 6". */
    sizeAlert: text(),
    /** Cuándo Gaby le enseñó la respuesta (deja de estar pendiente). */
    taughtAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index().on(t.conversationId, t.createdAt),
    index("assistant_messages_pending").on(t.createdAt).where(sql`${t.unanswered} is not null`),
  ],
);

/** Lo que Gaby le enseña a Galú desde el panel: va en sus instrucciones. */
export const assistantFacts = pgTable("assistant_facts", {
  id: uuid().primaryKey().defaultRandom(),
  question: text().notNull(),
  answer: text().notNull(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
