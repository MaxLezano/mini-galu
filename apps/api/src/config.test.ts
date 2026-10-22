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
  COOKIE_DOMAIN: "minigalu.com.ar",
  RESEND_API_KEY: "re_clave",
  S3_ENDPOINT: "https://cuenta.r2.cloudflarestorage.com",
  S3_BUCKET: "fotos",
  S3_ACCESS_KEY_ID: "id",
  S3_SECRET_ACCESS_KEY: "secreto",
  MEDIA_PUBLIC_URL: "https://fotos.minigalu.com.ar",
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
    expect(config.arca).toBeNull();
    expect(config.s3).toBeNull();
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
    expect(config.s3).toMatchObject({ bucket: "fotos", region: "auto", publicUrl: "https://fotos.minigalu.com.ar" });
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
      expect.stringContaining("se pierden al redeployar"),
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

  it("en producción pide el bucket de fotos completo y con dominio https", () => {
    expect(problemsOf({ ...production, S3_SECRET_ACCESS_KEY: undefined })).toEqual([
      expect.stringContaining("faltan S3_SECRET_ACCESS_KEY"),
    ]);
    expect(problemsOf({ ...production, MEDIA_PUBLIC_URL: "http://fotos.minigalu.com.ar" })).toEqual([
      expect.stringContaining("MEDIA_PUBLIC_URL"),
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

  it("WhatsApp: con token y número, las plantillas de fábrica; en producción avisa si está a medias", () => {
    expect(parseConfig({ ...production, WHATSAPP_TOKEN: "EAAG", WHATSAPP_PHONE_NUMBER_ID: "123" }).whatsapp).toEqual({
      token: "EAAG",
      phoneNumberId: "123",
      templates: { pedido: "aviso_pedido", novedad: "aviso_novedad" },
      language: "es_AR",
    });
    expect(parseConfig(production).whatsapp).toBeNull();
    expect(problemsOf({ ...production, WHATSAPP_TOKEN: "EAAG" })).toEqual([
      expect.stringContaining("WHATSAPP_PHONE_NUMBER_ID"),
    ]);
  });

  it("en producción pide COOKIE_DOMAIN si tienda y API están en hosts distintos, y que contenga a los dos", () => {
    expect(parseConfig(production).cookieDomain).toBe("minigalu.com.ar");
    expect(parseConfig({ ...production, COOKIE_DOMAIN: ".minigalu.com.ar" }).cookieDomain).toBe("minigalu.com.ar");
    expect(problemsOf({ ...production, COOKIE_DOMAIN: undefined })).toEqual([
      expect.stringContaining("cargá COOKIE_DOMAIN"),
    ]);
    // vercel.app y onrender.com no comparten dominio: la tienda no vería la sesión
    expect(
      problemsOf({
        ...production,
        WEB_ORIGIN: "https://mini-galu.vercel.app",
        PUBLIC_API_URL: "https://mini-galu-api.onrender.com",
      }),
    ).toEqual([expect.stringContaining("COOKIE_DOMAIN (minigalu.com.ar) tiene que contener")]);
  });

  it("ARCA: el CUIT sin guiones, el PEM en una línea y, en producción, avisa si está a medias", () => {
    // en el .env los saltos van escritos como \n
    const pem = "-----BEGIN CERTIFICATE-----\\nMIIB\\n-----END CERTIFICATE-----";
    const config = parseConfig({
      ...local,
      ARCA_CUIT: "20-12345678-6",
      ARCA_PUNTO_VENTA: "3",
      ARCA_CERT: pem,
      ARCA_KEY: pem,
    });
    expect(config.arca).toMatchObject({ env: "homologacion", cuit: "20123456786", pointOfSale: 3 });
    expect(config.arca?.cert).toBe("-----BEGIN CERTIFICATE-----\nMIIB\n-----END CERTIFICATE-----");
    expect(problemsOf({ ...production, ARCA_CUIT: "20123456786" })).toEqual([
      expect.stringContaining("ARCA a medias: faltan ARCA_PUNTO_VENTA, ARCA_CERT, ARCA_KEY"),
    ]);
    expect(problemsOf({ ...local, ARCA_CUIT: "123" })).toEqual([expect.stringContaining("ARCA_CUIT")]);
  });

  it("toma el puerto de PORT (Render, Fly) si no hay API_PORT", () => {
    expect(parseConfig({ ...local, PORT: "10000" }).port).toBe(10000);
    expect(parseConfig({ ...local, PORT: "10000", API_PORT: "4000" }).port).toBe(4000);
    expect(parseConfig(local).port).toBe(4000);
  });
});
