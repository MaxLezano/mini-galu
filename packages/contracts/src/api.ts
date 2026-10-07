import { z } from "zod";

/** Forma de error de la API: { error: { code, message, details? } } */
export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), details: z.unknown().optional() }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;
