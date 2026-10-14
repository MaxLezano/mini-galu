import {
  ASSISTANT_DEFAULT_SETTINGS,
  type AssistantChat,
  type AssistantEvent,
  CatalogQuerySchema,
  type ProductSummary,
  type Size,
} from "@mini-galu/contracts";
import {
  type ChatTurn,
  MAX_TOOL_ROUNDS,
  type StoreFacts,
  systemPrompt,
  type ToolResult,
  UNANSWERED_TOOL,
} from "../domain/conversation";
import type { AssistantCatalog, AssistantMemory, ChatOwner, LlmProvider } from "./ports";
import type { AssistantTools } from "./tools";

/** Tarjetas debajo de una respuesta, como máximo (panel de Galú en celular). */
const MAX_CARDS = 4;

const NOBODY: ChatOwner = { userId: null, cartToken: null };

/**
 * Galú responde: arma las instrucciones (con lo que Gaby le enseñó y los ajustes del panel), deja que el modelo pida
 * tools (sobre los casos de uso), y va mandando el texto a medida que se escribe y, al final, las prendas que consultó
 * como tarjetas. Si la charla trae id, la pregunta y la respuesta quedan guardadas para el panel.
 */
export class AssistantService {
  constructor(
    private readonly llm: LlmProvider | null,
    private readonly tools: AssistantTools,
    private readonly catalog: AssistantCatalog,
    private readonly facts: StoreFacts,
    private readonly memory: AssistantMemory,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  get provider(): string | null {
    return this.llm?.name ?? null;
  }

  async chat(
    req: AssistantChat,
    emit: (e: AssistantEvent) => void | Promise<void>,
    owner: ChatOwner = NOBODY,
  ): Promise<void> {
    const llm = this.llm;
    if (!llm) throw new Error("Galú no tiene un modelo configurado");
    const askedAt = this.clock();

    const [published, viewing, saved, taught] = await Promise.all([
      this.catalog.search(CatalogQuerySchema.parse({ instock: "0" })),
      req.productSlug ? this.catalog.product(req.productSlug) : null,
      this.memory.settings.get(),
      this.memory.facts.list(),
    ]);
    const settings = { ...ASSISTANT_DEFAULT_SETTINGS, ...saved };
    const system = systemPrompt(
      this.facts,
      published.map((p) => ({ slug: p.slug, name: p.name })),
      viewing && viewing.status === "published" ? { slug: viewing.slug, name: viewing.name } : null,
      { ...settings, facts: taught },
    );
    const tools = [...this.tools.specs, UNANSWERED_TOOL];
    const question = req.messages[req.messages.length - 1]?.text ?? "";
    const turns: ChatTurn[] = req.messages.map((m) =>
      m.role === "user" ? { role: "user", text: m.text } : { role: "assistant", text: m.text, toolCalls: [] },
    );

    // las tarjetas son las prendas de la última consulta de prendas (la más cercana a lo que se respondió)
    let cards: { products: ProductSummary[]; size: Size | null } | null = null;
    let unanswered: string | null = null;
    let answer = "";
    const onText = (delta: string) => {
      if (!delta) return;
      void emit({ type: "text", delta });
      answer += delta;
    };

    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const last = round === MAX_TOOL_ROUNDS;
      const out = await llm.respond({ system, turns, tools: last ? [] : tools }, onText);
      if (!out.toolCalls.length || last) break;
      turns.push({ role: "assistant", text: out.text, toolCalls: out.toolCalls, raw: out.raw });
      // el modelo puede escribir algo antes de pedir una tool: se separa del texto que sigue
      if (out.text.trim() && answer) onText("\n\n");
      const results: ToolResult[] = [];
      for (const call of out.toolCalls) {
        if (call.name === UNANSWERED_TOOL.name) {
          const q = (call.input as { pregunta?: unknown } | null)?.pregunta;
          unanswered = (typeof q === "string" && q.trim() ? q : question).trim().slice(0, 300);
          results.push({
            id: call.id,
            name: call.name,
            content: "Anotado: Gaby lo va a ver y te va a enseñar la respuesta. Ahora respondé con lo que sabés.",
            isError: false,
          });
          continue;
        }
        const r = await this.tools.run(call.name, call.input, settings).catch((e: unknown) => ({
          content: `Error: ${e instanceof Error ? e.message : "no se pudo consultar"}`,
          isError: true,
          products: undefined,
          size: undefined,
        }));
        const shown = settings.onlyInStock
          ? r.products?.filter((p) => p.variants.some((v) => v.stock > 0))
          : r.products;
        if (shown?.length) cards = { products: shown.slice(0, MAX_CARDS), size: r.size ?? null };
        results.push({ id: call.id, name: call.name, content: r.content, isError: r.isError });
      }
      turns.push({ role: "tool", results });
    }

    if (!answer) onText("Uy, no me salió la respuesta. ¿Me lo preguntás de nuevo, con otras palabras?");
    if (cards?.products.length) await emit({ type: "products", ...cards });
    await emit({ type: "done" });
    if (req.conversationId)
      await this.remember(req.conversationId, owner, req.productSlug, question, answer, unanswered, askedAt);
  }

  /** Guarda la pregunta y la respuesta (si falla, la charla sigue: el panel pierde ese par y nada más). */
  private async remember(
    id: string,
    owner: ChatOwner,
    productSlug: string | undefined,
    question: string,
    answer: string,
    unanswered: string | null,
    askedAt: Date,
  ) {
    await this.memory.log
      .append(
        { id, owner, productSlug: productSlug ?? null },
        [
          { role: "user", text: question, unanswered: null },
          { role: "assistant", text: answer.trim(), unanswered },
        ],
        askedAt,
      )
      .catch((e: unknown) => console.error("[galú] no se pudo guardar la charla", e));
  }
}
