import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import type { ArcaConfig } from "./invoicing/infrastructure/arca/wsaa";
import type { S3StorageConfig } from "./shared/media/s3-image-storage";
import type { AndreaniConfig } from "./shipping/infrastructure/andreani/andreani-client";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().default(4000),
  DATABASE_URL: z.string({ error: "falta (postgres://…)" }).min(1, "falta (postgres://…)"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  MEDIA_DIR: z.string().default("./storage/media"),
  /** Fotos en un bucket S3 (Cloudflare R2 en producción). Sin estas variables, en el disco (MEDIA_DIR). */
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Dominio público del bucket (R2: dominio propio o r2.dev), de donde la tienda baja las fotos. */
  MEDIA_PUBLIC_URL: z.string().optional(),
  /** URL pública de la API (para armar las URLs de imágenes). */
  PUBLIC_API_URL: z.string().optional(),
  /**
   * Dominio que comparten tienda y API (ej. minigalu.com.ar para minigalu.com.ar + api.minigalu.com.ar): la cookie
   * de sesión se pone ahí para que el servidor de la tienda también la vea. Hace falta si los hosts son distintos.
   */
  COOKIE_DOMAIN: z.string().optional(),
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
  /** Producción: Resend (resend.com → API Keys). Con la clave, los mails salen por su API en vez de SMTP. */
  RESEND_API_KEY: z.string().optional(),
  /** Envíos simulados: cuántas horas del correo pasan por hora real (60 = una por minuto, para probar a mano). */
  FAKE_ANDREANI_SPEED: z.coerce.number().positive().default(1),
  /** Cada cuántos segundos se consultan los eventos de los envíos sin entregar. */
  TRACKING_EVERY_SECONDS: z.coerce.number().int().min(30).default(600),
  /** Sucursales para retirar: las reales de Andreani (API pública) o unas fijas (tests y CI, sin internet). */
  ANDREANI_BRANCHES: z.enum(["andreani", "fake"]).optional(),
  /** API REST de Andreani. Sin todas estas variables, envíos simulados (FakeAndreani) y tabla por zona. */
  ANDREANI_ENV: z.enum(["qa", "produccion"]).default("qa"),
  /** "Continuar con Google" en la tienda (Google Cloud → credenciales OAuth). Sin ellas no se muestra. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  /** El panel exige verificación en dos pasos (por defecto, solo en producción). */
  REQUIRE_ADMIN_2FA: z.enum(["true", "false"]).optional(),
  /** Galú: con ANTHROPIC_API_KEY usa Claude; si no, con OLLAMA_URL usa Ollama; sin ninguno, responde por reglas. */
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-5-5"),
  OLLAMA_URL: z.string().optional(),
  OLLAMA_MODEL: z.string().default("qwen3:4b"),
  ANDREANI_USER: z.string().optional(),
  ANDREANI_PASSWORD: z.string().optional(),
  ANDREANI_CLIENT: z.string().optional(),
  ANDREANI_CONTRACT_DOMICILIO: z.string().optional(),
  ANDREANI_CONTRACT_SUCURSAL: z.string().optional(),
  /**
   * Factura electrónica (ARCA, WSFE). Sin estas variables, en local y CI se factura con el emisor simulado; en
   * producción los pedidos quedan sin facturar y el panel lo avisa. CERT y KEY: el PEM (con \n) o la ruta al archivo.
   */
  ARCA_ENV: z.enum(["homologacion", "produccion"]).default("homologacion"),
  ARCA_CUIT: z
    .string()
    .transform((s) => s.replace(/\D/g, ""))
    .pipe(z.string().length(11, "ARCA_CUIT: 11 números"))
    .optional(),
  ARCA_PUNTO_VENTA: z.coerce.number().int().min(1).max(99_998).optional(),
  ARCA_CERT: z.string().optional(),
  ARCA_KEY: z.string().optional(),
});

/** Solo para desarrollo local: en producción BETTER_AUTH_SECRET es obligatorio. */
const DEV_AUTH_SECRET = "solo-desarrollo-mini-galu-no-usar-en-produccion";

export type Config = {
  env: "development" | "test" | "production";
  port: number;
  databaseUrl: string;
  webOrigin: string;
  mediaDir: string;
  /** Con bucket, las fotos se suben ahí; si no, quedan en `mediaDir` y las sirve la API en /media. */
  s3: S3StorageConfig | null;
  publicUrl: string;
  /** Con tienda y API en hosts distintos, dominio común para la cookie de sesión. */
  cookieDomain: string | null;
  authSecret: string;
  mercadoPago: {
    accessToken: string;
    publicKey: string;
    webhookSecret: string | null;
    mode: "prueba" | "produccion";
  } | null;
  mail:
    | { kind: "resend"; apiKey: string; from: string }
    | { kind: "smtp"; host: string; port: number; user?: string; pass?: string; from: string };
  fakeAndreaniSpeed: number;
  trackingEverySeconds: number;
  branches: "andreani" | "fake";
  andreani: AndreaniConfig | null;
  arca: ArcaConfig | null;
  requireAdmin2fa: boolean;
  google: { clientId: string; clientSecret: string } | null;
  assistant: { kind: "claude"; apiKey: string; model: string } | { kind: "ollama"; url: string; model: string } | null;
};

/** El entorno no alcanza para arrancar: lleva todos los problemas juntos para arreglarlos de una vez. */
export class ConfigError extends Error {
  constructor(readonly problems: string[]) {
    super(`Configuración inválida:\n${problems.map((p) => `  - ${p}`).join("\n")}`);
    this.name = "ConfigError";
  }
}

export function loadConfig(): Config {
  // en local la API corre desde apps/api; el .env vive en la raíz del monorepo
  const rootEnv = resolve(process.cwd(), "../../.env");
  if (!process.env.DATABASE_URL && existsSync(rootEnv)) process.loadEnvFile(rootEnv);
  return parseConfig(process.env);
}

const isHttps = (url: string | undefined) => !!url && /^https:\/\/[^/]/.test(url);
const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};
const underDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** La cookie de sesión la pone la API y la tiene que ver la tienda (el navegador y su servidor). */
function cookieProblem(env: z.infer<typeof EnvSchema>): string | null {
  if (!(env.PUBLIC_API_URL && env.WEB_ORIGIN)) return null;
  const api = hostOf(env.PUBLIC_API_URL);
  const web = hostOf(env.WEB_ORIGIN);
  const domain = env.COOKIE_DOMAIN?.replace(/^\./, "");
  if (!domain)
    return api === web
      ? null
      : `La tienda (${web}) y la API (${api}) están en hosts distintos: cargá COOKIE_DOMAIN con el dominio que comparten`;
  if (!(underDomain(api, domain) && underDomain(web, domain)))
    return `COOKIE_DOMAIN (${domain}) tiene que contener a la tienda (${web}) y a la API (${api})`;
  return null;
}
const missing = (vars: Record<string, string | undefined>) =>
  Object.entries(vars)
    .filter(([, v]) => !v)
    .map(([k]) => k);

const missingS3 = (env: z.infer<typeof EnvSchema>) =>
  missing({
    S3_ENDPOINT: env.S3_ENDPOINT,
    S3_BUCKET: env.S3_BUCKET,
    S3_ACCESS_KEY_ID: env.S3_ACCESS_KEY_ID,
    S3_SECRET_ACCESS_KEY: env.S3_SECRET_ACCESS_KEY,
    MEDIA_PUBLIC_URL: env.MEDIA_PUBLIC_URL,
  });
const S3_VARS = 5;

const missingArca = (env: z.infer<typeof EnvSchema>) =>
  missing({
    ARCA_CUIT: env.ARCA_CUIT,
    ARCA_PUNTO_VENTA: env.ARCA_PUNTO_VENTA ? String(env.ARCA_PUNTO_VENTA) : undefined,
    ARCA_CERT: env.ARCA_CERT,
    ARCA_KEY: env.ARCA_KEY,
  });
const ARCA_VARS = 4;

/** El certificado o la clave de ARCA: el PEM en la variable (con los saltos como \n) o la ruta a un archivo. */
export function readPem(value: string): string {
  const v = value.trim();
  if (v.startsWith("-----BEGIN")) return v.replace(/\\n/g, "\n");
  return readFileSync(resolve(process.cwd(), v), "utf8");
}

/** Lo que producción necesita sí o sí (en local todo tiene un valor por defecto o un simulador). */
function productionProblems(env: z.infer<typeof EnvSchema>): string[] {
  const problems: string[] = [];
  if (!env.BETTER_AUTH_SECRET) problems.push("Falta BETTER_AUTH_SECRET (generalo con `openssl rand -base64 32`)");
  else if (env.BETTER_AUTH_SECRET.length < 32) problems.push("BETTER_AUTH_SECRET tiene que tener 32 caracteres o más");
  const mp = missing({
    MP_ACCESS_TOKEN: env.MP_ACCESS_TOKEN,
    MP_PUBLIC_KEY: env.MP_PUBLIC_KEY,
    MP_WEBHOOK_SECRET: env.MP_WEBHOOK_SECRET,
  });
  if (mp.length) problems.push(`Faltan las credenciales de Mercado Pago (${mp.join(", ")})`);
  if (!isHttps(env.PUBLIC_API_URL)) problems.push("PUBLIC_API_URL tiene que ser la URL pública de la API con https://");
  if (!isHttps(env.WEB_ORIGIN)) problems.push("WEB_ORIGIN tiene que ser la URL de la tienda con https://");
  const cookie = cookieProblem(env);
  if (cookie) problems.push(cookie);
  if (env.RESEND_API_KEY) {
    if (!env.RESEND_API_KEY.startsWith("re_"))
      problems.push("RESEND_API_KEY no parece una clave de Resend (empieza con re_)");
  } else if (/^(localhost|127\.0\.0\.1)$/.test(env.SMTP_HOST))
    problems.push("Los mails apuntan a Mailpit (localhost): cargá RESEND_API_KEY (o un SMTP de producción)");
  else if (!(env.SMTP_USER && env.SMTP_PASS)) problems.push("Faltan SMTP_USER y SMTP_PASS");
  const s3 = missingS3(env);
  if (s3.length === S3_VARS)
    problems.push(
      "Las fotos irían al disco del servidor y se pierden al redeployar: cargá el bucket (S3_*, MEDIA_PUBLIC_URL)",
    );
  else if (s3.length) problems.push(`Bucket de fotos a medias: faltan ${s3.join(", ")}`);
  else if (!isHttps(env.MEDIA_PUBLIC_URL))
    problems.push("MEDIA_PUBLIC_URL tiene que ser el dominio público del bucket con https://");
  const andreani = missing({
    ANDREANI_USER: env.ANDREANI_USER,
    ANDREANI_PASSWORD: env.ANDREANI_PASSWORD,
    ANDREANI_CLIENT: env.ANDREANI_CLIENT,
    ANDREANI_CONTRACT_DOMICILIO: env.ANDREANI_CONTRACT_DOMICILIO,
    ANDREANI_CONTRACT_SUCURSAL: env.ANDREANI_CONTRACT_SUCURSAL,
  });
  // sin ninguna, envíos simulados; con algunas, seguro es un error de carga
  if (andreani.length && andreani.length < 5) problems.push(`Andreani a medias: faltan ${andreani.join(", ")}`);
  const arca = missingArca(env);
  // sin ninguna, los pedidos quedan sin facturar (el panel avisa); con algunas, seguro es un error de carga
  if (arca.length && arca.length < ARCA_VARS) problems.push(`ARCA a medias: faltan ${arca.join(", ")}`);
  if (!env.GOOGLE_CLIENT_ID !== !env.GOOGLE_CLIENT_SECRET)
    problems.push("Google a medias: van GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET juntos");
  return problems;
}

export function parseConfig(source: Record<string, string | undefined>): Config {
  // Render y Fly avisan el puerto en PORT
  const parsed = EnvSchema.safeParse({ ...source, API_PORT: source.API_PORT || source.PORT });
  if (!parsed.success)
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join(".") || "entorno"}: ${i.message}`));
  const env = parsed.data;
  if (env.NODE_ENV === "production") {
    const problems = productionProblems(env);
    if (problems.length) throw new ConfigError(problems);
  }
  return {
    env: env.NODE_ENV,
    port: env.API_PORT,
    databaseUrl: env.DATABASE_URL,
    webOrigin: env.WEB_ORIGIN,
    mediaDir: resolve(process.cwd(), env.MEDIA_DIR),
    s3:
      env.S3_ENDPOINT && env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.MEDIA_PUBLIC_URL
        ? {
            endpoint: env.S3_ENDPOINT,
            bucket: env.S3_BUCKET,
            region: env.S3_REGION,
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
            publicUrl: env.MEDIA_PUBLIC_URL,
          }
        : null,
    publicUrl: env.PUBLIC_API_URL ?? `http://localhost:${env.API_PORT}`,
    cookieDomain: env.COOKIE_DOMAIN?.replace(/^\./, "") || null,
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
    mail: env.RESEND_API_KEY
      ? { kind: "resend", apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM }
      : {
          kind: "smtp",
          host: env.SMTP_HOST,
          port: env.SMTP_PORT,
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
          from: env.MAIL_FROM,
        },
    fakeAndreaniSpeed: env.FAKE_ANDREANI_SPEED,
    trackingEverySeconds: env.TRACKING_EVERY_SECONDS,
    branches: env.ANDREANI_BRANCHES ?? (env.NODE_ENV === "test" ? "fake" : "andreani"),
    google:
      env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
        ? { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }
        : null,
    requireAdmin2fa: env.REQUIRE_ADMIN_2FA ? env.REQUIRE_ADMIN_2FA === "true" : env.NODE_ENV === "production",
    assistant: env.ANTHROPIC_API_KEY
      ? { kind: "claude", apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL }
      : env.OLLAMA_URL
        ? { kind: "ollama", url: env.OLLAMA_URL, model: env.OLLAMA_MODEL }
        : null,
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
    arca:
      env.ARCA_CUIT && env.ARCA_PUNTO_VENTA && env.ARCA_CERT && env.ARCA_KEY
        ? {
            env: env.ARCA_ENV,
            cuit: env.ARCA_CUIT,
            pointOfSale: env.ARCA_PUNTO_VENTA,
            cert: readPem(env.ARCA_CERT),
            key: readPem(env.ARCA_KEY),
          }
        : null,
  };
}
