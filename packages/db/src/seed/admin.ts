import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import type { Db } from "../client";
import * as s from "../schema";

/** Credenciales de la usuaria del taller. En local hay valores por defecto; en producción son obligatorias. */
export function adminCredentials() {
  const prod = process.env.NODE_ENV === "production";
  const email = process.env.ADMIN_EMAIL || (prod ? "" : "gaby@minigalu.com.ar");
  const password = process.env.ADMIN_PASSWORD || (prod ? "" : "taller-mini-galu");
  if (!email || !password) throw new Error("Faltan ADMIN_EMAIL y ADMIN_PASSWORD");
  if (password.length < 8) throw new Error("ADMIN_PASSWORD necesita al menos 8 caracteres");
  return { name: process.env.ADMIN_NAME || "Gaby", email: email.toLowerCase(), password };
}

/** Crea (o actualiza) la cuenta admin con email y contraseña, en el formato de Better Auth. Idempotente. */
export async function upsertAdmin(db: Db) {
  const { name, email, password } = adminCredentials();
  const hash = await hashPassword(password);
  const [existing] = await db.select({ id: s.user.id }).from(s.user).where(eq(s.user.email, email));
  const userId = existing?.id ?? randomUUID();

  if (existing) await db.update(s.user).set({ name, role: "admin" }).where(eq(s.user.id, userId));
  else await db.insert(s.user).values({ id: userId, name, email, emailVerified: true, role: "admin" });

  const credential = and(eq(s.account.userId, userId), eq(s.account.providerId, "credential"));
  const [acc] = await db.select({ id: s.account.id }).from(s.account).where(credential);
  if (acc) await db.update(s.account).set({ password: hash }).where(eq(s.account.id, acc.id));
  else
    await db
      .insert(s.account)
      .values({ id: randomUUID(), accountId: userId, providerId: "credential", userId, password: hash });

  return email;
}
