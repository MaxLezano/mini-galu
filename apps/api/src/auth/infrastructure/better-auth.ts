import { PasswordSchema } from "@mini-galu/contracts";
import { type Db, schema as s } from "@mini-galu/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { LoginGuard } from "../domain/login-guard";

/** Rutas de Better Auth que reciben una contraseña nueva, y el campo donde viene. */
const PASSWORD_FIELDS: Record<string, string> = {
  "/sign-up/email": "password",
  "/change-password": "newPassword",
  "/reset-password": "newPassword",
};

type AuthConfig = {
  publicUrl: string;
  webOrigin: string;
  secret: string;
  secureCookies: boolean;
  /** Límite de pedidos por IP de Better Auth (producción). */
  rateLimit: boolean;
  /** Se bloqueó una cuenta por intentos fallidos: avisarle (si existe). */
  onLoginLocked?: (email: string) => Promise<void>;
};

/**
 * Better Auth: email + contraseña para el panel del taller.
 * El registro público está apagado: la cuenta admin la crea el seed. En la fase 8 se habilita para clientes (+ Google).
 * Seguridad: verificación en dos pasos (TOTP + códigos de respaldo), límite por IP y bloqueo por cuenta.
 */
export function createAuth(db: Db, config: AuthConfig, guard = new LoginGuard()) {
  return betterAuth({
    appName: "Mini Galú",
    baseURL: config.publicUrl,
    basePath: "/auth",
    secret: config.secret,
    trustedOrigins: [config.webOrigin],
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: s.user,
        session: s.session,
        account: s.account,
        verification: s.verification,
        twoFactor: s.twoFactor,
      },
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
        twoFactorEnabled: { type: "boolean", input: false, defaultValue: false },
      },
    },
    // la regla de contraseña (8+, mayúscula, minúscula, número y especial) se valida también acá, no solo en la web
    plugins: [twoFactor({ issuer: "Mini Galú · Taller", backupCodeOptions: { amount: 8 } })],
    rateLimit: {
      enabled: config.rateLimit,
      window: 60,
      max: 120,
      customRules: { "/sign-in/email": { window: 60, max: 10 }, "/two-factor/*": { window: 60, max: 10 } },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-in/email") {
          const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "");
          if (guard.lockedUntil(email))
            throw new APIError("TOO_MANY_REQUESTS", {
              message: "Demasiados intentos fallidos. Esperá 15 minutos y probá de nuevo.",
            });
        }
        const field = PASSWORD_FIELDS[ctx.path];
        if (!field) return;
        const r = PasswordSchema.safeParse((ctx.body as Record<string, unknown> | undefined)?.[field] ?? "");
        if (!r.success)
          throw new APIError("BAD_REQUEST", { message: r.error.issues[0]?.message ?? "Contraseña inválida" });
      }),
      // cuenta los intentos fallidos por cuenta; al bloquear, se le avisa a la cuenta por mail
      after: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-in/email") return;
        const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "");
        const failed = isAPIError(ctx.context.returned) && ctx.context.returned.statusCode === 401;
        if (!failed) return guard.succeed(email);
        if (guard.fail(email).lockedNow) await config.onLoginLocked?.(email).catch(() => {});
      }),
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    advanced: {
      useSecureCookies: config.secureCookies,
      // detrás del proxy de Render/Fly la IP real viene en estos headers
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
