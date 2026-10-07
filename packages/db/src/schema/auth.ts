import { boolean, index, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

/**
 * Tablas de Better Auth (user, session, account, verification) con los campos que exige la v1.7,
 * más los datos de la clienta. La contraseña NO está acá: vive hasheada en account.password (proveedor "credential").
 * `role` distingue al taller (admin) de los clientes. Al taller le alcanza con nombre, email y contraseña.
 */
export const userRole = pgEnum("user_role", ["admin", "customer"]);
export const documentType = pgEnum("document_type", ["DNI", "CUIT", "CUIL", "PAS"]);

const stamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

export const user = pgTable("user", {
  id: text().primaryKey(),
  /** Nombre completo que exige Better Auth: siempre `${firstName} ${lastName}`. */
  name: text().notNull(),
  firstName: text().notNull().default(""),
  lastName: text().notNull().default(""),
  /** Login y avisos (pedidos, lista de espera). Se verifica al crear la cuenta; con Google ya viene verificado. */
  email: text().notNull().unique(),
  emailVerified: boolean().notNull().default(false),
  /** Foto: URL de Google o ruta propia en el ImageStorage (avatars/{id}.webp, convertida y achicada al subir). */
  image: text(),
  role: userRole().notNull().default("customer"),
  /** Teléfono en formato internacional E.164 (+5491155551234) y país elegido en el selector (AR, US…). */
  phone: varchar({ length: 16 }),
  phoneCountry: varchar({ length: 2 }),
  /** Lo piden Mercado Pago (pagos con tarjeta) y Andreani (envíos). Opcional hasta el checkout. */
  documentType: documentType(),
  documentNumber: varchar({ length: 15 }),
  /** "Cartas del taller" (newsletter). */
  newsletterOptIn: boolean().notNull().default(false),
  /** Cuándo aceptó términos y privacidad (Ley 25.326 de datos personales). */
  termsAcceptedAt: timestamp({ withTimezone: true }),
  ...stamps,
});

export const session = pgTable(
  "session",
  {
    id: text().primaryKey(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    token: text().notNull().unique(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ...stamps,
  },
  (t) => [index().on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    ...stamps,
  },
  (t) => [index().on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  ...stamps,
});
