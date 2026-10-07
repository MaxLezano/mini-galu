import { type Db, schema as s } from "@mini-galu/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

type AuthConfig = { publicUrl: string; webOrigin: string; secret: string; secureCookies: boolean };

/**
 * Better Auth: email + contraseña para el panel del taller.
 * El registro público está apagado: la cuenta admin la crea el seed. En la fase 8 se habilita para clientes (+ Google).
 */
export function createAuth(db: Db, config: AuthConfig) {
  return betterAuth({
    baseURL: config.publicUrl,
    basePath: "/auth",
    secret: config.secret,
    trustedOrigins: [config.webOrigin],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: { user: s.user, session: s.session, account: s.account, verification: s.verification },
    }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8 },
    user: { additionalFields: { role: { type: "string", input: false, defaultValue: "customer" } } },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: config.secureCookies },
  });
}

export type Auth = ReturnType<typeof createAuth>;
