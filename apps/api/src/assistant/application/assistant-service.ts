import {
  type AssistantChat,
  type AssistantEvent,
  CatalogQuerySchema,
  type ProductSummary,
  type Size,
} from "@mini-galu/contracts";
import { type ChatTurn, MAX_TOOL_ROUNDS, type StoreFacts, systemPrompt, type ToolResult } from "../domain/conversation";
import type { AssistantCatalog, LlmProvider } from "./ports";
import type { AssistantTools } from "./tools";

/** Tarjetas debajo de una respuesta, como máximo (panel de Galú en celular). */
const MAX_CARDS = 4;

/**
 * Galú responde: arma las instrucciones, deja que el modelo pida tools (sobre los casos de uso), y va
 * mandando el texto a medida que se escribe y, al final, las prendas que consultó como tarjetas.
 */
export class AssistantService {
  constructor(
    private readonly llm: LlmProvider | null,
    private readonly tools: AssistantTools,
    private readonly catalog: AssistantCatalog,
    private readonly facts: StoreFacts,
  ) {}

  get provider(): string | null {
    return this.llm?.name ?? null;
  }

  async chat(req: AssistantChat, emit: (e: AssistantEvent) => void | Promise<void>): Promise<void> {
    const llm = this.llm;
    if (!llm) throw new Error("Galú no tiene un modelo configurado");

    const [published, viewing] = await Promise.all([
      this.catalog.search(CatalogQuerySchema.parse({ instock: "0" })),
      req.productSlug ? this.catalog.product(req.productSlug) : null,
    ]);
    const system = systemPrompt(
      this.facts,
      published.map((p) => ({ slug: p.slug, name: p.name })),
      viewing && viewing.status === "published" ? { slug: viewing.slug, name: viewing.name } : null,
    );
    const turns: ChatTurn[] = req.messages.map((m) =>
      m.role === "user" ? { role: "user", text: m.text } : { role: "assistant", text: m.text, toolCalls: [] },
    );

    // las tarjetas son las prendas de la última consulta de prendas (la más cercana a lo que se respondió)
    let cards: { products: ProductSummary[]; size: Size | null } | null = null;
    let wrote = false;
    const onText = (delta: string) => {
      if (!delta) return;
      void emit({ type: "text", delta });
      wrote = true;
    };

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const last = round === MAX_TOOL_ROUNDS;
      const out = await llm.respond({ system, turns, tools: last ? [] : this.tools.specs }, onText);
      if (!out.toolCalls.length || last) break;
      turns.push({ role: "assistant", text: out.text, toolCalls: out.toolCalls, raw: out.raw });
      // el modelo puede escribir algo antes de pedir una tool: se separa del texto que sigue
      if (out.text.trim() && wrote) void emit({ type: "text", delta: "\n\n" });
      const results: ToolResult[] = [];
      for (const call of out.toolCalls) {
        const r = await this.tools.run(call.name, call.input).catch((e: unknown) => ({
          content: `Error: ${e instanceof Error ? e.message : "no se pudo consultar"}`,
          isError: true,
          products: undefined,
          size: undefined,
        }));
        if (r.products) cards = { products: r.products.slice(0, MAX_CARDS), size: r.size ?? null };
        results.push({ id: call.id, name: call.name, content: r.content, isError: r.isError });
      }
      turns.push({ role: "tool", results });
    }

    if (!wrote)
      await emit({
        type: "text",
        delta: "Uy, no me salió la respuesta. ¿Me lo preguntás de nuevo, con otras palabras?",
      });
    if (cards?.products.length) await emit({ type: "products", ...cards });
    // TODO(fase 7 · assistant): guardar la conversación y lo que no supo responder para "enseñale"
    await emit({ type: "done" });
  }
}
