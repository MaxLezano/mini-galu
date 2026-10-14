import { sql } from "drizzle-orm";
import { check, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { orders } from "./orders";

export const giftcardStatus = pgEnum("giftcard_status", ["esperando_pago", "activa", "anulada"]);

/**
 * Gift cards (giftcards.html): se compran como un pedido de tipo "giftcard" (mismo pago con Mercado Pago) y al
 * pagarse se activan con un código. Valen 6 meses y se usan en varias compras hasta agotar el saldo.
 */
export const giftcards = pgTable(
  "giftcards",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** El pedido con el que se pagó. */
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** GALU-7KQ2-… (se arma al activarse). */
    code: text(),
    status: giftcardStatus().notNull().default("esperando_pago"),
    amountCents: integer().notNull(),
    balanceCents: integer().notNull(),
    /** cacao · rosa · salvia · lino */
    design: text().notNull(),
    toName: text().notNull(),
    fromName: text().notNull(),
    message: text(),
    /** mail · whatsapp */
    via: text().notNull(),
    /** Mail o celular (E.164) de quien la recibe. */
    recipient: text().notNull(),
    /** Cuándo se manda (null: apenas se paga). */
    deliverAt: timestamp({ withTimezone: true }),
    deliveredAt: timestamp({ withTimezone: true }),
    expiresAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex().on(t.code),
    index().on(t.orderId),
    check("giftcard_balance_ok", sql`${t.balanceCents} >= 0 and ${t.balanceCents} <= ${t.amountCents}`),
  ],
);

/** Cada uso de una gift card en un pedido (para devolver el saldo si el pedido se cancela). */
export const giftcardRedemptions = pgTable(
  "giftcard_redemptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    giftcardId: uuid()
      .notNull()
      .references(() => giftcards.id, { onDelete: "cascade" }),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    amountCents: integer().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.giftcardId, t.orderId)],
);
