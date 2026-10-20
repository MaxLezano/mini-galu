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
  /** La charla (la genera el navegador al primer mensaje): así se guarda para el panel. */
  conversationId: z.uuid().optional(),
});
export type AssistantChat = z.infer<typeof AssistantChatSchema>;

/**
 * Una pregunta que la tienda respondió por reglas (sin modelo en la API): se guarda igual para el panel.
 * `unanswered`: Galú no supo responder (va a "Enseñale").
 */
export const AssistantRulesLogSchema = z.object({
  conversationId: z.uuid(),
  productSlug: z.string().max(80).optional(),
  question: z.string().trim().min(1).max(ASSISTANT_MAX_CHARS),
  answer: z.string().trim().min(1).max(4000),
  unanswered: z.boolean().default(false),
});
export type AssistantRulesLog = z.input<typeof AssistantRulesLogSchema>;
export type AssistantRulesLogRequest = z.output<typeof AssistantRulesLogSchema>;

/** Lo que llega por SSE mientras Galú responde (POST /assistant/chat). */
export type AssistantEvent =
  | { type: "text"; delta: string }
  | { type: "products"; products: ProductSummary[]; size: Size | null }
  | { type: "done" }
  | { type: "error"; message: string };

/* ------------------------------------------------------------------ panel (admin-galu.html) */

/** Ajustes de Galú (admin-galu.html → Ajustes). */
export const AssistantSettingsSchema = z.object({
  /** Si no sabe algo, sugiere escribirle a Gaby por WhatsApp. */
  whatsappFallback: z.boolean(),
  /** Si no queda el talle que buscan, ofrece una gift card. */
  giftcardWhenNoSize: z.boolean(),
  /** Tarjetas y búsquedas solo con prendas con stock. */
  onlyInStock: z.boolean(),
  tone: z.enum(["calido", "formal"]),
});
export type AssistantSettings = z.infer<typeof AssistantSettingsSchema>;

export const ASSISTANT_DEFAULT_SETTINGS: AssistantSettings = {
  whatsappFallback: true,
  giftcardWhenNoSize: true,
  onlyInStock: true,
  tone: "calido",
};

export const ASSISTANT_TONES: Record<AssistantSettings["tone"], string> = {
  calido: "Cálido y cercano (vos)",
  formal: "Más formal",
};

/** Clave de una pregunta: "¿Hacen vestidos a medida?" y "hacen vestidos a medida" son la misma. */
export function questionKey(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Enseñale": una pregunta y la respuesta de Gaby. */
export const AssistantFactInputSchema = z.object({
  question: z.string().trim().min(3, "Escribí la pregunta").max(300),
  answer: z.string().trim().min(3, "Escribí la respuesta primero").max(1000),
});
export type AssistantFactInput = z.infer<typeof AssistantFactInputSchema>;

export type AssistantFact = AssistantFactInput & { id: string; createdAt: string };

/**
 * Lo enseñado que responde una pregunta (GET /assistant/taught?q=…): la tienda lo usa cuando responde por reglas.
 * La respuesta ya trae las {variables} de Tienda y pagos con su valor.
 */
export type AssistantTaught = { question: string; answer: string } | null;

/**
 * compra: terminó en un pedido pagado · sin_respuesta: algo no lo supo (y todavía no se lo enseñaron) ·
 * aviso: pidió que le avisen cuando vuelva un talle (quedó en la lista de espera).
 */
export type ConversationOutcome = "compra" | "sin_respuesta" | "aviso";

export type AdminConversation = {
  id: string;
  /** "Valeria G." (cuenta o pedido) o null si no se sabe quién es. */
  who: string | null;
  startedAt: string;
  lastAt: string;
  outcome: ConversationOutcome | null;
  order: { number: string; totalCents: number } | null;
  messages: {
    role: "user" | "assistant";
    text: string;
    unanswered: string | null;
    taught: boolean;
    /** "Vestido Samanta · talle 6": Galú la anotó en la lista de espera. */
    sizeAlert: string | null;
  }[];
};

/** Una pregunta que Galú no supo responder y nadie le enseñó todavía. */
export type PendingQuestion = { question: string; times: number; lastAt: string };

export type AdminAssistant = {
  /** "claude" · "ollama" · null (la tienda responde por reglas; las charlas se guardan igual). */
  provider: string | null;
  stats: {
    chats: number;
    chatsBefore: number;
    bought: number;
    boughtCents: number;
    unanswered: number;
    /** Avisos de talle que anotó Galú en la lista de espera. */
    sizeAlerts: number;
  };
  conversations: AdminConversation[];
  pending: PendingQuestion[];
  facts: AssistantFact[];
  settings: AssistantSettings;
};

/** Galú en el resumen, la campana y el menú del panel: charlas de los últimos 7 días y lo que no supo responder. */
export type AssistantOverview = {
  chats: number;
  /** Cuántas de esas charlas terminaron en un pedido pagado. */
  bought: number;
  pending: PendingQuestion[];
};

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
