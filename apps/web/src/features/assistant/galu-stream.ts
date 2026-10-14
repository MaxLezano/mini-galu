import type { AssistantChat, AssistantEvent } from "@mini-galu/contracts";
import { API_URL } from "@/lib/api";
import { parseSse } from "./galu-sse";

/** Galú no está disponible (sin modelo en la API, caída o límite): la tienda responde por reglas. */
export class GaluOffline extends Error {}

/** Pregunta a Galú (POST /assistant/chat) y va entregando los eventos a medida que llegan. */
export async function askGalu(
  chat: AssistantChat,
  onEvent: (e: AssistantEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${API_URL}/assistant/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    // la cookie de la bolsa (o la sesión) dice de quién es la charla en el panel
    credentials: "include",
    body: JSON.stringify(chat),
    signal,
  }).catch(() => null);
  if (!res?.ok || !res.body) throw new GaluOffline(res ? `HTTP ${res.status}` : "sin conexión");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    const { events, rest } = parseSse(buf + decoder.decode(value, { stream: true }));
    buf = rest;
    for (const e of events) onEvent(e);
  }
  for (const e of parseSse(`${buf}\n\n`).events) onEvent(e);
}
