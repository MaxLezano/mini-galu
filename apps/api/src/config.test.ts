import { describe, expect, it } from "vitest";
import { ConfigError, parseConfig } from "./config";

const local = { DATABASE_URL: "postgres://minigalu:minigalu@localhost:5433/minigalu" };

const production = {
  NODE_ENV: "production",
  DATABASE_URL: "postgres://u:p@db.neon.tech/minigalu",
  BETTER_AUTH_SECRET: "x".repeat(32),
  MP_ACCESS_TOKEN: "APP_USR-token",
  MP_PUBLIC_KEY: "APP_USR-public",
  MP_WEBHOOK_SECRET: "secreto",
  PUBLIC_API_URL: "https://api.minigalu.com.ar",
  WEB_ORIGIN: "https://minigalu.com.ar",
  RESEND_API_KEY: "re_clave",
};

function problemsOf(env: Record<string, string | undefined>): string[] {
  try {
    parseConfig(env);
    return [];
  } catch (err) {
    if (err instanceof ConfigError) return err.problems;
    throw err;
  }
}

describe("parseConfig", () => {
  it("en local arranca solo con la base: simuladores y valores por defecto", () => {
    const config = parseConfig(local);
    expect(config.env).toBe("development");
    expect(config.mercadoPago).toBeNull();
    expect(config.andreani).toBeNull();
    expect(config.mail).toMatchObject({ kind: "smtp", host: "localhost", port: 1025 });
    expect(config.requireAdmin2fa).toBe(false);
  });

  it("sin DATABASE_URL lo dice con nombre", () => {
    expect(problemsOf({})).toEqual([expect.stringContaining("DATABASE_URL")]);
  });

  it("en producción con todo cargado arranca, con 2FA en el panel", () => {
    const config = parseConfig(production);
    expect(config.publicUrl).toBe("https://api.minigalu.com.ar");
    expect(config.mercadoPago?.webhookSecret).toBe("secreto");
    expect(config.requireAdmin2fa).toBe(true);
    expect(config.mail).toEqual({ kind: "resend", apiKey: "re_clave", from: "Mini Galú <hola@minigalu.com.ar>" });
  });

  it("en producción acepta un SMTP propio en vez de Resend", () => {
    const config = parseConfig({
      ...production,
      RESEND_API_KEY: undefined,
      SMTP_HOST: "smtp.proveedor.com",
      SMTP_PORT: "465",
      SMTP_USER: "u",
      SMTP_PASS: "p",
    });
    expect(config.mail).toMatchObject({ kind: "smtp", host: "smtp.proveedor.com", port: 465 });
  });

  it("en producción junta todo lo que falta en un solo error", () => {
    const problems = problemsOf({ NODE_ENV: "production", DATABASE_URL: production.DATABASE_URL });
    expect(problems).toEqual([
      expect.stringContaining("BETTER_AUTH_SECRET"),
      expect.stringContaining("MP_ACCESS_TOKEN, MP_PUBLIC_KEY, MP_WEBHOOK_SECRET"),
      expect.stringContaining("PUBLIC_API_URL"),
      expect.stringContaining("WEB_ORIGIN"),
      expect.stringContaining("Mailpit"),
    ]);
  });

  it("en producción rechaza URLs sin https, un secreto corto y el SMTP sin credenciales", () => {
    const problems = problemsOf({
      ...production,
      BETTER_AUTH_SECRET: "corto",
      PUBLIC_API_URL: "http://api.minigalu.com.ar",
      RESEND_API_KEY: undefined,
      SMTP_HOST: "smtp.proveedor.com",
      SMTP_USER: "u",
    });
    expect(problems).toEqual([
      expect.stringContaining("32 caracteres"),
      expect.stringContaining("PUBLIC_API_URL"),
      expect.stringContaining("SMTP_USER y SMTP_PASS"),
    ]);
  });

  it("en producción avisa si RESEND_API_KEY no es una clave de Resend", () => {
    expect(problemsOf({ ...production, RESEND_API_KEY: "smtp-pass" })).toEqual([expect.stringContaining("re_")]);
  });

  it("en producción avisa de Andreani o Google cargados a medias", () => {
    const problems = problemsOf({ ...production, ANDREANI_USER: "u", GOOGLE_CLIENT_ID: "id" });
    expect(problems).toEqual([
      expect.stringContaining("faltan ANDREANI_PASSWORD, ANDREANI_CLIENT"),
      expect.stringContaining("GOOGLE_CLIENT_SECRET"),
    ]);
  });
});
