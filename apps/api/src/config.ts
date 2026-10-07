import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string().min(1),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  MEDIA_DIR: z.string().default("./storage/media"),
  /** URL pública de la API (para armar las URLs de imágenes). */
  PUBLIC_API_URL: z.string().optional(),
  BETTER_AUTH_SECRET: z.string().optional(),
  /** Mercado Pago. Sin MP_ACCESS_TOKEN, en local se cobra con el gateway simulado. */
  MP_ACCESS_TOKEN: z.string().optional(),
  MP_PUBLIC_KEY: z.string().optional(),
  MP_WEBHOOK_SECRET: z.string().optional(),
  MP_MODE: z.enum(["prueba", "produccion"]).default("prueba"),
});

/** Solo para desarrollo local: en producción BETTER_AUTH_SECRET es obligatorio. */
const DEV_AUTH_SECRET = "solo-desarrollo-mini-galu-no-usar-en-produccion";

export type Config = {
  env: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  webOrigin: string;
  mediaDir: string;
  publicUrl: string;
  authSecret: string;
  mercadoPago: {
    accessToken: string;
    publicKey: string;
    webhookSecret: string | null;
    mode: "prueba" | "produccion";
  } | null;
};

export function loadConfig(): Config {
  // en local la API corre desde apps/api; el .env vive en la raíz del monorepo
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (!process.env.DATABASE_URL && existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  const env = EnvSchema.parse(process.env);
  if (env.NODE_ENV === "production" && !env.BETTER_AUTH_SECRET) throw new Error("Falta BETTER_AUTH_SECRET");
  if (env.NODE_ENV === "production" && !(env.MP_ACCESS_TOKEN && env.MP_PUBLIC_KEY && env.MP_WEBHOOK_SECRET))
    throw new Error("Faltan las credenciales de Mercado Pago (MP_ACCESS_TOKEN, MP_PUBLIC_KEY, MP_WEBHOOK_SECRET)");
  return {
    env: env.NODE_ENV,
    port: env.API_PORT,
    databaseUrl: env.DATABASE_URL,
    webOrigin: env.WEB_ORIGIN,
    mediaDir: resolve(process.cwd(), env.MEDIA_DIR),
    publicUrl: env.PUBLIC_API_URL ?? `http://localhost:${env.API_PORT}`,
    authSecret: env.BETTER_AUTH_SECRET || DEV_AUTH_SECRET,
    mercadoPago:
      env.MP_ACCESS_TOKEN && env.MP_PUBLIC_KEY
        ? {
            accessToken: env.MP_ACCESS_TOKEN,
            publicKey: env.MP_PUBLIC_KEY,
            webhookSecret: env.MP_WEBHOOK_SECRET || null,
            mode: env.MP_MODE,
          }
        : null,
  };
}
