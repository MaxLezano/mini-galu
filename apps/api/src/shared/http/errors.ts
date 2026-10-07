import type { ApiError } from "@mini-galu/contracts";
import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { z } from "zod";
import { AppError, ValidationError } from "../domain/errors";

const STATUS: Record<string, ContentfulStatusCode> = { not_found: 404, validation_error: 422, conflict: 409 };

export function onError(err: Error, c: Context) {
  if (err instanceof AppError) {
    const body: ApiError = { error: { code: err.code, message: err.message, details: err.details } };
    return c.json(body, STATUS[err.code] ?? 400);
  }
  console.error(err);
  const body: ApiError = { error: { code: "internal_error", message: "Algo salió mal" } };
  return c.json(body, 500);
}

/** Valida input con un schema de contracts; si falla, ValidationError con los issues. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  const r = schema.safeParse(data);
  if (!r.success) throw new ValidationError("Datos inválidos", r.error.issues);
  return r.data;
}
