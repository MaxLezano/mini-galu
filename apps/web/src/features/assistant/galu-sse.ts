import type { AssistantEvent } from "@mini-galu/contracts";

/** Separa los eventos SSE completos de lo que quedó a medias (llega cortado en cualquier lugar). */
export function parseSse(buffer: string): { events: AssistantEvent[]; rest: string } {
  const blocks = buffer.replace(/\r\n/g, "\n").split("\n\n");
  const rest = blocks.pop() ?? "";
  const events = blocks.flatMap((b) => {
    const data = b
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data) return [];
    try {
      return [JSON.parse(data) as AssistantEvent];
    } catch {
      return [];
    }
  });
  return { events, rest };
}

/** "El **Samanta** está…" → tramos de texto con o sin negrita (lo único de markdown que se muestra). */
export function boldSegments(text: string): { text: string; bold: boolean }[] {
  return text
    .split(/(\*\*[^*\n]+\*\*)/)
    .filter(Boolean)
    .map((s) => (/^\*\*[^*\n]+\*\*$/.test(s) ? { text: s.slice(2, -2), bold: true } : { text: s, bold: false }));
}
