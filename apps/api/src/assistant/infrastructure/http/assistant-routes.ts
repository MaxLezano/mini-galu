import { AssistantChatSchema, type AssistantEvent } from "@mini-galu/contracts";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { parse } from "../../../shared/http/errors";
import { clientIp, RateLimiter } from "../../../shared/http/rate-limit";
import type { AssistantService } from "../../application/assistant-service";

/**
 * /assistant — Galú en la tienda. POST /chat responde por SSE (eventos AssistantEvent).
 * Sin modelo configurado responde 503 y la tienda usa las respuestas por reglas.
 */
export function assistantRoutes(assistant: AssistantService, limiter = new RateLimiter(30, 10 * 60_000)) {
  return new Hono()
    .get("/", (c) => c.json({ available: !!assistant.provider }))
    .post("/chat", async (c) => {
      if (!assistant.provider)
        return c.json({ error: { code: "assistant_off", message: "Galú no tiene un modelo configurado" } }, 503);
      const req = parse(AssistantChatSchema, await c.req.json());
      if (!limiter.take(clientIp(c)))
        return c.json(
          { error: { code: "too_many_requests", message: "Muchas preguntas seguidas: probá en unos minutos" } },
          429,
        );
      return streamSSE(c, async (stream) => {
        const send = (e: AssistantEvent) => stream.writeSSE({ event: e.type, data: JSON.stringify(e) });
        try {
          await assistant.chat(req, send);
        } catch (e) {
          console.error("[galú]", e);
          await send({ type: "error", message: "Galú no está disponible ahora" });
        }
      });
    });
}
