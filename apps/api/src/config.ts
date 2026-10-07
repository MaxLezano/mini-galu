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
});

export type Config = {
  env: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  webOrigin: string;
  mediaDir: string;
  publicUrl: string;
};

export function loadConfig(): Config {
  // en local la API corre desde apps/api; el .env vive en la raíz del monorepo
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (!process.env.DATABASE_URL && existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  const env = EnvSchema.parse(process.env);
  return {
    env: env.NODE_ENV,
    port: env.API_PORT,
    databaseUrl: env.DATABASE_URL,
    webOrigin: env.WEB_ORIGIN,
    mediaDir: resolve(process.cwd(), env.MEDIA_DIR),
    publicUrl: env.PUBLIC_API_URL ?? `http://localhost:${env.API_PORT}`,
  };
}
