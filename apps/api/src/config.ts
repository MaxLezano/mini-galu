import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { AndreaniConfig } from "./shipping/infrastructure/andreani/andreani-client";

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
  /** Mails. Local: Mailpit (docker compose) en localhost:1025; la bandeja se ve en http://localhost:8025. */
  SMTP_HOST: z.string().default("localhost"),
  SMTP_PORT: z.coerce.number().int().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default("Mini Galú <hola@minigalu.com.ar>"),
  /** Envíos simulados: cuántas horas del correo pasan por hora real (60 = una por minuto, para probar a mano). */
  FAKE_ANDREANI_SPEED: z.coerce.number().positive().default(1),
  /** Cada cuántos segundos se consultan los eventos de los envíos sin entregar. */
  TRACKING_EVERY_SECONDS: z.coerce.number().int().min(30).default(600),
  /** Sucursales para retirar: las reales de Andreani (API pública) o unas fijas (tests y CI, sin internet). */
  ANDREANI_BRANCHES: z.enum(["andreani", "fake"]).optional(),
  /** API REST de Andreani. Sin todas estas variables, envíos simulados (FakeAndreani) y tabla por zona. */
  ANDREANI_ENV: z.enum(["qa", "produccion"]).default("qa"),
  ANDREANI_USER: z.string().optional(),
  ANDREANI_PASSWORD: z.string().optional(),
  ANDREANI_CLIENT: z.string().optional(),
  ANDREANI_CONTRACT_DOMICILIO: z.string().optional(),
  ANDREANI_CONTRACT_SUCURSAL: z.string().optional(),
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
  smtp: { host: string; port: number; user?: string; pass?: string; from: string };
  fakeAndreaniSpeed: number;
  trackingEverySeconds: number;
  branches: "andreani" | "fake";
  andreani: AndreaniConfig | null;
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
    smtp: {
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
      from: env.MAIL_FROM,
    },
    fakeAndreaniSpeed: env.FAKE_ANDREANI_SPEED,
    trackingEverySeconds: env.TRACKING_EVERY_SECONDS,
    branches: env.ANDREANI_BRANCHES ?? (env.NODE_ENV === "test" ? "fake" : "andreani"),
    andreani:
      env.ANDREANI_USER &&
      env.ANDREANI_PASSWORD &&
      env.ANDREANI_CLIENT &&
      env.ANDREANI_CONTRACT_DOMICILIO &&
      env.ANDREANI_CONTRACT_SUCURSAL
        ? {
            env: env.ANDREANI_ENV,
            user: env.ANDREANI_USER,
            password: env.ANDREANI_PASSWORD,
            client: env.ANDREANI_CLIENT,
            contracts: { domicilio: env.ANDREANI_CONTRACT_DOMICILIO, sucursal: env.ANDREANI_CONTRACT_SUCURSAL },
          }
        : null,
  };
}
