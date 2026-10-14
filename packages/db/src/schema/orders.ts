import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { variants } from "./catalog";

const stamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ bolsa */

/**
 * Bolsa guardada en el servidor. La de invitada se identifica con la cookie `mg_cart` (token);
 * la de una cuenta, por userId. Al ingresar, la de invitada se suma a la de la cuenta y se borra.
 */
export const carts = pgTable("carts", {
  id: uuid().primaryKey().defaultRandom(),
  token: text().unique(),
  userId: text()
    .unique()
    .references(() => user.id, { onDelete: "cascade" }),
  ...stamps,
});

export const cartItems = pgTable(
  "cart_items",
  {
    cartId: uuid()
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    variantId: uuid()
      .notNull()
      .references(() => variants.id, { onDelete: "cascade" }),
    qty: integer().notNull(),
    addedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.cartId, t.variantId] }), check("cart_qty_positive", sql`${t.qty} > 0`)],
);

/* ------------------------------------------------------------------ cupones */

export const couponKind = pgEnum("coupon_kind", ["percent", "fixed", "free_shipping"]);
export const couponAudience = pgEnum("coupon_audience", ["todos", "primera_compra", "resena", "cumple", "anotados"]);

export const coupons = pgTable(
  "coupons",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Siempre en mayúsculas y sin espacios (PRIMAVERA15). */
    code: varchar({ length: 20 }).notNull().unique(),
    kind: couponKind().notNull(),
    /** Porcentaje (1–100) o monto fijo en centavos; 0 para envío gratis. */
    value: integer().notNull().default(0),
    minSubtotalCents: integer(),
    audience: couponAudience().notNull().default("todos"),
    endsAt: timestamp({ withTimezone: true }),
    maxUses: integer(),
    oncePerCustomer: boolean().notNull().default(true),
    active: boolean().notNull().default(true),
    /** Usos con pago aprobado (desnormalizado). */
    timesUsed: integer().notNull().default(0),
    ...stamps,
  },
  (t) => [check("coupon_value_non_negative", sql`${t.value} >= 0`)],
);

/* ------------------------------------------------------------------ pedidos */

export const orderStatus = pgEnum("order_status", [
  "esperando_pago",
  "nuevo",
  "preparando",
  "listo",
  "en_camino",
  "entregado",
  "cancelado",
  "reembolsado",
]);
export const shippingMethod = pgEnum("shipping_method", ["domicilio", "sucursal", "taller"]);
export const paymentMethod = pgEnum("payment_method", ["credito", "debito", "dinero_cuenta", "link", "giftcard"]);
/** Por dónde entró la venta: la web o un link de pago mandado por WhatsApp/Instagram, o una charla con Galú. */
export const orderChannel = pgEnum("order_channel", ["web", "whatsapp", "instagram", "galu"]);

/** Dirección de entrega tal como la cargó el cliente al comprar (no cambia si después edita su libreta). */
export type ShippingAddress = {
  street: string;
  number: string;
  unit: string | null;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
};

/** Sucursal del correo donde retira el cliente (envío a sucursal). */
export type ShippingBranch = { id: string; name: string; address: string };

export const orders = pgTable(
  "orders",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Número que ve la gente: MG-1001, MG-1002… */
    number: integer().notNull().unique().generatedAlwaysAsIdentity({ startWith: 1001 }),
    /** Para consultar el pedido sin cuenta (pantalla de éxito, vuelta de Mercado Pago). */
    accessToken: text().notNull(),
    status: orderStatus().notNull().default("esperando_pago"),
    /** Cuándo pasó al estado actual (para ordenar el tablero y medir demoras). */
    statusChangedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    channel: orderChannel().notNull().default("web"),
    userId: text().references(() => user.id, { onDelete: "set null" }),
    /** Bolsa desde la que se compró: se vacía al aprobarse el pago y, si se vuelve a pedir, el pedido anterior se cancela. */
    cartId: uuid(),
    email: text().notNull(),
    firstName: text().notNull(),
    lastName: text().notNull(),
    /** E.164 (+5491155551234). */
    phone: varchar({ length: 16 }).notNull(),
    whatsappOptIn: boolean().notNull().default(true),
    shippingMethod: shippingMethod().notNull(),
    shippingAddress: jsonb().$type<ShippingAddress>(),
    shippingBranch: jsonb().$type<ShippingBranch>(),
    postalCode: varchar({ length: 8 }),
    province: text(),
    /** Retiro en el taller: franja elegida ("2026-10-08T10:00/13:00"). */
    pickupSlot: text(),
    subtotalCents: integer().notNull(),
    discountCents: integer().notNull().default(0),
    shippingCents: integer().notNull().default(0),
    totalCents: integer().notNull(),
    couponId: uuid().references(() => coupons.id, { onDelete: "set null" }),
    couponCode: varchar({ length: 20 }),
    paymentMethod: paymentMethod(),
    installments: integer(),
    /** Mientras espera el pago, el stock queda reservado hasta acá; después se libera solo. */
    reservedUntil: timestamp({ withTimezone: true }),
    paidAt: timestamp({ withTimezone: true }),
    cancelledAt: timestamp({ withTimezone: true }),
    cancelReason: text(),
    /** Nota del taller (no la ve el cliente): "envolver con cuidado", "le prometí el moño a juego"… */
    internalNote: text(),
    ...stamps,
  },
  (t) => [
    index().on(t.status),
    index().on(t.email),
    index().on(t.cartId),
    index("orders_reserved_until").on(t.reservedUntil).where(sql`${t.status} = 'esperando_pago'`),
    check("order_total_non_negative", sql`${t.totalCents} >= 0`),
  ],
);

/** Ítems con precio, nombre y foto congelados al momento de la compra. */
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    variantId: uuid().references(() => variants.id, { onDelete: "set null" }),
    productSlug: text().notNull(),
    name: text().notNull(),
    colorName: text().notNull(),
    size: text().notNull(),
    imagePath: text(),
    unitPriceCents: integer().notNull(),
    qty: integer().notNull(),
  },
  (t) => [index().on(t.orderId), check("order_item_qty_positive", sql`${t.qty} > 0`)],
);

/** Cada intento de pago (aprobado, rechazado, pendiente). Mercado Pago puede avisar varias veces: idempotente por id. */
export const payments = pgTable(
  "payments",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text().notNull(),
    providerPaymentId: text().notNull(),
    status: text().notNull(),
    statusDetail: text(),
    method: paymentMethod(),
    installments: integer(),
    amountCents: integer().notNull(),
    raw: jsonb(),
    ...stamps,
  },
  (t) => [uniqueIndex().on(t.provider, t.providerPaymentId), index().on(t.orderId)],
);

export const couponRedemptions = pgTable(
  "coupon_redemptions",
  {
    id: uuid().primaryKey().defaultRandom(),
    couponId: uuid()
      .notNull()
      .references(() => coupons.id, { onDelete: "cascade" }),
    orderId: uuid()
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    email: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.couponId, t.email)],
);

/**
 * Historial del pedido (detalle en el panel): qué pasó y si lo hizo el sistema solo (`auto`) o alguien del taller.
 * kind: created · paid · status · mail · expired · cancelled · note…
 */
export const orderEvents = pgTable(
  "order_events",
  {
    id: uuid().primaryKey().defaultRandom(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    kind: text().notNull(),
    title: text().notNull(),
    detail: text(),
    auto: boolean().notNull().default(false),
    /** En los cambios de estado, a cuál pasó (el seguimiento público arma el recorrido con esto). */
    toStatus: orderStatus(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index().on(t.orderId, t.createdAt)],
);
