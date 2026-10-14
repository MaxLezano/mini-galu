import { describe, expect, it } from "vitest";
import { RateLimiter } from "../../shared/http/rate-limit";
import type { ChatTurn } from "../domain/conversation";
import { toMessages } from "./claude-provider";
import { OllamaProvider, toOllama } from "./ollama-provider";

const turns: ChatTurn[] = [
  { role: "user", text: "¿talle 6?" },
  { role: "assistant", text: "", toolCalls: [{ id: "a1", name: "buscar_prendas", input: { talle: "6" } }] },
  { role: "tool", results: [{ id: "a1", name: "buscar_prendas", content: '{"total":0}', isError: false }] },
];

describe("OllamaProvider", () => {
  it("manda tools y charla en el formato de Ollama y junta el texto y los pedidos de tools del stream", async () => {
    let body: Record<string, unknown> = {};
    const lines = [
      { message: { role: "assistant", content: "Busco" } },
      { message: { role: "assistant", content: " ya." } },
      {
        message: {
          role: "assistant",
          content: "",
          tool_calls: [{ function: { name: "talle_para", arguments: { edad: 5 } } }],
        },
      },
      { done: true },
    ];
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      // las líneas llegan cortadas en cualquier lugar
      const raw = lines.map((l) => JSON.stringify(l)).join("\n");
      const parts = [raw.slice(0, 17), raw.slice(17, 90), raw.slice(90)];
      return new Response(
        new ReadableStream({
          start(c) {
            for (const p of parts) c.enqueue(new TextEncoder().encode(p));
            c.close();
          },
        }),
      );
    }) as unknown as typeof fetch;

    const deltas: string[] = [];
    const out = await new OllamaProvider("http://ollama:11434/", "qwen2.5:3b", fakeFetch).respond(
      {
        system: "Sos Galú",
        turns,
        tools: [{ name: "talle_para", description: "talle", parameters: { type: "object" } }],
      },
      (d) => deltas.push(d),
    );
    expect(deltas.join("")).toBe("Busco ya.");
    expect(out).toEqual({ text: "Busco ya.", toolCalls: [{ id: "call_1", name: "talle_para", input: { edad: 5 } }] });
    expect(body).toMatchObject({
      model: "qwen2.5:3b",
      stream: true,
      messages: [{ role: "system", content: "Sos Galú" }, { role: "user" }, { role: "assistant" }, { role: "tool" }],
      tools: [{ type: "function", function: { name: "talle_para" } }],
    });
  });

  it("un error de Ollama se propaga (la tienda usa las reglas)", async () => {
    const fakeFetch = (async () => new Response("model not found", { status: 404 })) as unknown as typeof fetch;
    await expect(
      new OllamaProvider("http://ollama", "x", fakeFetch).respond({ system: "", turns, tools: [] }, () => {}),
    ).rejects.toThrow(/404/);
  });

  it("los resultados de tools van como mensajes role tool con su nombre", () => {
    expect(toOllama(turns)).toEqual([
      { role: "user", content: "¿talle 6?" },
      {
        role: "assistant",
        content: "",
        tool_calls: [{ function: { name: "buscar_prendas", arguments: { talle: "6" } } }],
      },
      { role: "tool", tool_name: "buscar_prendas", content: '{"total":0}' },
    ]);
  });
});

describe("ClaudeProvider · toMessages", () => {
  it("tool_use y tool_result en bloques; los bloques originales del modelo vuelven tal cual", () => {
    expect(toMessages(turns)).toEqual([
      { role: "user", content: "¿talle 6?" },
      { role: "assistant", content: [{ type: "tool_use", id: "a1", name: "buscar_prendas", input: { talle: "6" } }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "a1", content: '{"total":0}' }] },
    ]);
    const raw = [
      { type: "thinking", thinking: "", signature: "s" },
      { type: "tool_use", id: "b", name: "x", input: {} },
    ];
    expect(toMessages([{ role: "assistant", text: "", toolCalls: [], raw }])).toEqual([
      { role: "assistant", content: raw },
    ]);
    expect(
      toMessages([{ role: "tool", results: [{ id: "b", name: "x", content: "no", isError: true }] }])[0],
    ).toMatchObject({ content: [{ is_error: true }] });
  });
});

describe("RateLimiter", () => {
  it("deja pasar hasta el máximo por ventana y se renueva", () => {
    let now = 0;
    const l = new RateLimiter(2, 1000, () => now);
    expect([l.take("ip"), l.take("ip"), l.take("ip"), l.take("otra")]).toEqual([true, true, false, true]);
    now = 1000;
    expect(l.take("ip")).toBe(true);
  });
});
