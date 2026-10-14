import { describe, expect, it } from "vitest";
import { boldSegments, parseSse } from "./galu-sse";

describe("parseSse", () => {
  it("devuelve los eventos completos y guarda lo que quedó cortado", () => {
    const a = parseSse('event: text\ndata: {"type":"text","delta":"Ho"}\n\nevent: text\ndata: {"type":"te');
    expect(a.events).toEqual([{ type: "text", delta: "Ho" }]);
    const b = parseSse(`${a.rest}xt","delta":"la"}\n\nevent: done\ndata: {"type":"done"}\n\n`);
    expect(b.events).toEqual([{ type: "text", delta: "la" }, { type: "done" }]);
    expect(b.rest).toBe("");
  });

  it("ignora bloques sin datos o rotos", () => {
    expect(parseSse(": ping\n\ndata: {roto\n\n").events).toEqual([]);
  });
});

describe("boldSegments", () => {
  it("separa la negrita del resto", () => {
    expect(boldSegments("El **Samanta** está $45.000")).toEqual([
      { text: "El ", bold: false },
      { text: "Samanta", bold: true },
      { text: " está $45.000", bold: false },
    ]);
    expect(boldSegments("sin ** cerrar")).toEqual([{ text: "sin ** cerrar", bold: false }]);
  });
});
