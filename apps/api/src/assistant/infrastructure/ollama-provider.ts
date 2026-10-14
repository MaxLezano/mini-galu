import type { LlmProvider } from "../application/ports";
import type { ChatTurn, ToolCall, ToolSpec } from "../domain/conversation";

type OllamaMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: { function: { name: string; arguments: unknown } }[];
  tool_name?: string;
};
type OllamaChunk = { message?: OllamaMessage; done?: boolean; error?: string };

/**
 * Galú en local, gratis: Ollama (`/api/chat`) con tools y streaming (una línea JSON por pedazo).
 * Los modelos que razonan (qwen3) lo mandan aparte en `message.thinking`, que no se muestra; no se pasa
 * `think: false` porque con qwen3 el razonamiento termina mezclado en el texto.
 */
export class OllamaProvider implements LlmProvider {
  readonly name: string;

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly fetchFn: typeof fetch = fetch,
  ) {
    this.name = `ollama (${model})`;
  }

  async respond(
    req: { system: string; turns: ChatTurn[]; tools: ToolSpec[] },
    onText: (delta: string) => void,
  ): Promise<{ text: string; toolCalls: ToolCall[] }> {
    const res = await this.fetchFn(`${this.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        options: { temperature: 0.3 },
        messages: [{ role: "system", content: req.system }, ...toOllama(req.turns)],
        ...(req.tools.length
          ? {
              tools: req.tools.map((t) => ({
                type: "function",
                function: { name: t.name, description: t.description, parameters: t.parameters },
              })),
            }
          : {}),
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Ollama respondió ${res.status}: ${await res.text().catch(() => "")}`);

    let text = "";
    const toolCalls: ToolCall[] = [];
    const take = (line: string) => {
      if (!line.trim()) return;
      const chunk = JSON.parse(line) as OllamaChunk;
      if (chunk.error) throw new Error(`Ollama: ${chunk.error}`);
      const m = chunk.message;
      if (m?.content) {
        text += m.content;
        onText(m.content);
      }
      for (const c of m?.tool_calls ?? [])
        toolCalls.push({ id: `call_${toolCalls.length + 1}`, name: c.function.name, input: c.function.arguments });
    };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) take(l);
    }
    take(buf + decoder.decode());
    return { text, toolCalls };
  }
}

export function toOllama(turns: ChatTurn[]): OllamaMessage[] {
  return turns.flatMap((t): OllamaMessage[] => {
    if (t.role === "user") return [{ role: "user", content: t.text }];
    if (t.role === "tool")
      return t.results.map((r) => ({
        role: "tool",
        tool_name: r.name,
        content: r.isError ? `Error: ${r.content}` : r.content,
      }));
    return [
      {
        role: "assistant",
        content: t.text,
        ...(t.toolCalls.length
          ? { tool_calls: t.toolCalls.map((c) => ({ function: { name: c.name, arguments: c.input } })) }
          : {}),
      },
    ];
  });
}
