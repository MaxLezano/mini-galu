import { PasswordSchema } from "@mini-galu/contracts";
import { type Db, schema as s } from "@mini-galu/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";

/** Rutas de Better Auth que reciben una contraseña nueva, y el campo donde viene. */
const PASSWORD_FIELDS: Record<string, string> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
};

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
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 8, maxPasswordLength: 128 },
    user: {
      additionalFields: {
        role: { type: "string", input: false, defaultValue: "customer" },
        firstName: { type: "string", required: false, defaultValue: "" },
        lastName: { type: "string", required: false, defaultValue: "" },
        phone: { type: "string", required: false },
        phoneCountry: { type: "string", required: false },
        newsletterOptIn: { type: "boolean", required: false, defaultValue: false },
      },
    },
    // la regla de contraseña (8+, mayúscula, minúscula, número y especial) se valida también acá, no solo en la web
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const field = PASSWORD_FIELDS[ctx.path];
        if (!field) return;
        const r = PasswordSchema.safeParse((ctx.body as Record<string, unknown> | undefined)?.[field] ?? "");
        if (!r.success)
          throw new APIError("BAD_REQUEST", { message: r.error.issues[0]?.message ?? "Contraseña inválida" });
      }),
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: { useSecureCookies: config.secureCookies },
  });
}

export type Auth = ReturnType<typeof createAuth>;
