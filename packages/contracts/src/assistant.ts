import { z } from "zod";
import type { ProductSummary, Size } from "./catalog";
import { GARMENT_SIZES } from "./catalog";

/* ------------------------------------------------------------------ Galú (asistente de la tienda) */

/** Largo máximo de cada mensaje y cuántos mensajes previos viajan (la charla vive en el navegador). */
export const ASSISTANT_MAX_CHARS = 500;
export const ASSISTANT_MAX_TURNS = 12;

export const AssistantMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).max(4000),
});
export type AssistantMessage = z.infer<typeof AssistantMessageSchema>;

export const AssistantChatSchema = z.object({
  /** La charla hasta acá; el último es la pregunta nueva (de quien compra). */
  messages: z
    .array(AssistantMessageSchema)
    .min(1)
    .transform((l) => l.slice(-ASSISTANT_MAX_TURNS))
    .refine((l) => l[l.length - 1]?.role === "user", "El último mensaje tiene que ser la pregunta")
    .refine(
      (l) => (l[l.length - 1]?.text.length ?? 0) <= ASSISTANT_MAX_CHARS,
      `La pregunta puede tener hasta ${ASSISTANT_MAX_CHARS} caracteres`,
    ),
  /** La prenda que se está mirando (ficha de producto), para "¿hay este en talle 4?". */
  productSlug: z.string().max(80).optional(),
});
export type AssistantChat = z.infer<typeof AssistantChatSchema>;

/** Lo que llega por SSE mientras Galú responde (POST /assistant/chat). */
export type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "products"; products: ProductSummary[]; size: Size | null }
  | { type: "done" }
  | { type: "error"; message: string };

/* ------------------------------------------------------------------ talle por edad y altura */

/**
 * Calculadora de talle (mockup producto.html): por altura y por edad, y gana el más grande
 * (los modelos tienen holgura: mejor que le dure). Con un solo dato, se usa ese.
 */
export function recommendSize(age: number | null, heightCm: number | null): Size {
  const byH: Size | null =
    heightCm == null
      ? null
      : heightCm < 80
        ? "12m"
        : heightCm < 92
          ? "2"
          : heightCm < 106
            ? "4"
            : heightCm < 118
              ? "6"
              : heightCm < 130
                ? "8"
                : "10";
  const byAge: Size | null = age == null ? null : age <= 1 ? "12m" : (String(Math.min(10, age + (age % 2))) as Size);
  const order = GARMENT_SIZES as readonly Size[];
  const idx = Math.max(byH ? order.indexOf(byH) : -1, byAge ? order.indexOf(byAge) : -1);
  return order[idx] ?? "10";
}
