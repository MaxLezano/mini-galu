import { index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { reviews } from "./catalog";
import { coupons } from "./orders";

/* ------------------------------------------------------------------ puntos por reseñas */

/** Cada fila suma (reseña publicada) o resta (canje por un cupón): el saldo es la suma de un mail. */
export const pointsEntries = pgTable(
  "points_entries",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Mail del pedido reseñado, en minúsculas: suma con o sin cuenta. */
    email: text().notNull(),
    points: integer().notNull(),
    /** La reseña que los dio: una sola vez por reseña. */
    reviewId: uuid().references(() => reviews.id, { onDelete: "set null" }),
    /** El cupón que salió del canje. */
    couponId: uuid().references(() => coupons.id, { onDelete: "set null" }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex().on(t.reviewId), index().on(t.email)],
);
