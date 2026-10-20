import type { ApiError } from "@mini-galu/contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { AppError, ValidationError } from "../domain/errors";

const STATUS: Record<string, ContentfulStatusCode> = {
  not_found: 404,
  validation_error: 422,
  conflict: 409,
  unauthorized: 401,
};

export function onError(err: Error, c: Context) {
  if (err instanceof AppError) {
    const body: ApiError = { error: { code: err.code, message: err.message, details: err.details } };
    return c.json(body, STATUS[err.code] ?? 400);
  }
  if (err instanceof SyntaxError) {
    const body: ApiError = { error: { code: "bad_request", message: "El cuerpo no es JSON válido" } };
    return c.json(body, 400);
  }
  // un id que no es UUID (/me/children/abc): Postgres no lo puede comparar, así que no existe
  if (pgCode(err) === "22P02") {
    const body: ApiError = { error: { code: "not_found", message: "No encontramos lo que buscás" } };
    return c.json(body, 404);
  }
  console.error(err);
  const body: ApiError = { error: { code: "internal_error", message: "Algo salió mal" } };
  return c.json(body, 500);
}

/** Código de error de Postgres (postgres.js lo pone en `code`; Drizzle lo envuelve en `cause`). */
function pgCode(err: unknown): string | null {
  for (let e = err, i = 0; e && typeof e === "object" && i < 3; e = (e as { cause?: unknown }).cause, i++) {
    const code = (e as { code?: unknown }).code;
    if (typeof code === "string" && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return null;
}

/** Valida input con un schema de contracts; si falla, ValidationError con los issues. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new ValidationError("Datos inválidos", r.error.issues);
  return r.data;
}
