import type Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "../application/ports";
import type { ChatTurn, ToolCall, ToolSpec } from "../domain/conversation";

/** Galú en producción: Claude (por defecto Haiku) con tools, streaming del texto y el system prompt cacheado. */
export class ClaudeProvider implements LlmProvider {
  readonly name: string;

  constructor(
    private readonly client: Anthropic,
    private readonly model: string,
  ) {
    this.name = `claude (${model})`;
  }

  async respond(
    req: { system: string; turns: ChatTurn[]; tools: ToolSpec[] },
    onText: (delta: string) => void,
  ): Promise<{ text: string; toolCalls: ToolCall[]; raw?: unknown }> {
    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: 8000,
      // respuestas cortas de tienda: poco esfuerzo alcanza y responde más rápido
      output_config: { effort: "low" },
      system: [{ type: "text", text: req.system, cache_control: { type: "ephemeral" } }],
      tools: req.tools.map(
        (t): Anthropic.Tool => ({
          name: t.name,
          description: t.description,
          input_schema: t.parameters as Anthropic.Tool.InputSchema,
        }),
      ),
      messages: toMessages(req.turns),
    });
    stream.on("text", onText);
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") {
      const text = "De eso no te puedo ayudar. ¿Te ayudo con talles, stock o envíos?";
      onText(text);
      return { text, toolCalls: [] };
    }
    const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    // si se cortó por largo, no se corre una tool con los parámetros a medias
    const toolCalls =
      msg.stop_reason === "max_tokens"
        ? []
        : msg.content
            .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
            .map((b) => ({ id: b.id, name: b.name, input: b.input }));
    return { text, toolCalls, raw: msg.content };
  }
}

/** La charla en el formato de la API de Claude (los bloques del modelo vuelven tal cual dentro del turno). */
export function toMessages(turns: ChatTurn[]): Anthropic.MessageParam[] {
  return turns.map((t): Anthropic.MessageParam => {
    if (t.role === "user") return { role: "user", content: t.text };
    if (t.role === "tool")
      return {
        role: "user",
        content: t.results.map((r) => ({
          type: "tool_result",
          tool_use_id: r.id,
          content: r.content,
          ...(r.isError ? { is_error: true } : {}),
        })),
      };
    if (t.raw) return { role: "assistant", content: t.raw as Anthropic.ContentBlockParam[] };
    return {
      role: "assistant",
      content: [
        ...(t.text ? [{ type: "text" as const, text: t.text }] : []),
        ...t.toolCalls.map((c) => ({ type: "tool_use" as const, id: c.id, name: c.name, input: c.input })),
      ],
    };
  });
}
