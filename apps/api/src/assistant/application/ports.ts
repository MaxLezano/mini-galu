import type {
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
