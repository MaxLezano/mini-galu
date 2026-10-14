import type {
  AdminConversation,
  AssistantFact,
  AssistantFactInput,
  AssistantSettings,
  CatalogQuery,
  ProductDetail,
  ProductSummary,
  PublicTracking,
  ShippingOptions,
} from "@mini-galu/contracts";
import type { ChatTurn, ToolCall, ToolSpec } from "../domain/conversation";

/** Un modelo de lenguaje (Ollama en local, Claude en producción). Va soltando el texto a medida que lo escribe. */
export interface LlmProvider {
  readonly name: string;
  respond(
    req: { system: string; turns: ChatTurn[]; tools: ToolSpec[] },
    onText: (delta: string) => void,
  ): Promise<{ text: string; toolCalls: ToolCall[]; raw?: unknown }>;
}

/** Lo que Galú consulta del catálogo (casos de uso de `catalog`). */
export interface AssistantCatalog {
  search(query: CatalogQuery): Promise<ProductSummary[]>;
  product(slug: string): Promise<ProductDetail | null>;
}

/** Seguimiento público de un pedido (sin la calle ni el apellido). */
export interface AssistantOrders {
  track(number: string): Promise<PublicTracking | null>;
}

/** Cotización de envío por código postal. */
export interface AssistantShipping {
  options(postalCode: string): Promise<ShippingOptions>;
}

/* ---------------------------------------------------------------- memoria (admin-galu.html) */

/** Quién charla: la cuenta o la bolsa de invitada (para saber si después compró). */
export type ChatOwner = { userId: string | null; cartToken: string | null };

export type NewChatMessage = { role: "user" | "assistant"; text: string; unanswered: string | null };

/** Una charla guardada, con el pedido pagado que vino después (si hubo). */
export type ConversationRecord = Omit<AdminConversation, "outcome" | "order"> & {
  order: { number: number; totalCents: number } | null;
};

export interface ConversationLog {
  /** Suma mensajes a la charla (la crea si es la primera vez). */
  append(
    c: { id: string; owner: ChatOwner; productSlug: string | null },
    messages: NewChatMessage[],
    at: Date,
  ): Promise<void>;
  /** Las últimas charlas desde `since`, con sus mensajes. */
  recent(since: Date, limit: number): Promise<ConversationRecord[]>;
  /** Charlas que empezaron desde `from` (y antes de `to`, si hay) y cuántas terminaron en un pedido pagado. */
  stats(from: Date, to: Date | null): Promise<{ chats: number; bought: number; boughtCents: number }>;
  /** Preguntas que no supo responder y nadie le enseñó todavía. */
  unanswered(since: Date): Promise<{ id: string; question: string; at: Date }[]>;
  markTaught(messageIds: string[], at: Date): Promise<void>;
}

/** Lo que Gaby le enseñó. */
export interface FactStore {
  list(): Promise<AssistantFact[]>;
  add(f: AssistantFactInput, at: Date): Promise<AssistantFact>;
  remove(id: string): Promise<boolean>;
}

export interface AssistantSettingsStore {
  get(): Promise<Partial<AssistantSettings>>;
  save(s: AssistantSettings): Promise<void>;
}

export type AssistantMemory = { log: ConversationLog; facts: FactStore; settings: AssistantSettingsStore };
