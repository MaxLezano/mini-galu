import { AssistantChatSchema, type AssistantEvent } from "@mini-galu/contracts";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { type CartVars, ensureOwner } from "../../../cart/infrastructure/http/cart-owner";
import { parse } from "../../../shared/http/errors";
import { clientIp, RateLimiter } from "../../../shared/http/rate-limit";
import type { AssistantService } from "../../application/assistant-service";
import type { ChatOwner } from "../../application/ports";

/**
 * /assistant — Galú en la tienda. POST /chat responde por SSE (eventos AssistantEvent).
 * Sin modelo configurado responde 503 y la tienda usa las respuestas por reglas.
 * Con `cartOwner` adelante, la charla queda a nombre de la cuenta o de la bolsa (para saber si terminó en compra).
 */
export function assistantRoutes(
  assistant: AssistantService,
  { secure = false, limiter = new RateLimiter(30, 10 * 60_000) }: { secure?: boolean; limiter?: RateLimiter } = {},
) {
  return new Hono<CartVars>()
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
      let owner: ChatOwner = { userId: null, cartToken: null };
      if (req.conversationId && c.get("cartOwner") !== undefined) {
        // la invitada sin bolsa recibe su cookie acá: si después compra, la charla cuenta como venta
        const o = ensureOwner(c, secure);
        owner = "userId" in o ? { userId: o.userId, cartToken: null } : { userId: null, cartToken: o.token };
      }
      return streamSSE(c, async (stream) => {
        const send = (e: AssistantEvent) => stream.writeSSE({ event: e.type, data: JSON.stringify(e) });
        try {
          await assistant.chat(req, send, owner);
        } catch (e) {
          console.error("[galú]", e);
          await send({ type: "error", message: "Galú no está disponible ahora" });
        }
      });
    });
}
