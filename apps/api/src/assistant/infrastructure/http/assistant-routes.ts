import { AssistantChatSchema, type AssistantEvent, AssistantRulesLogSchema } from "@mini-galu/contracts";
import type { Context } from "hono";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { type CartVars, ensureOwner } from "../../../cart/infrastructure/http/cart-owner";
import { parse } from "../../../shared/http/errors";
import { clientIp, RateLimiter } from "../../../shared/http/rate-limit";
import type { AssistantService } from "../../application/assistant-service";
import type { ChatOwner } from "../../application/ports";

/**
 * /assistant — Galú en la tienda. POST /chat responde por SSE (eventos AssistantEvent).
 * Sin modelo configurado responde 503 y la tienda usa las respuestas por reglas; POST /log guarda esas charlas.
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
      const owner = req.conversationId ? ownerOf(c, secure) : NOBODY;
      return streamSSE(c, async (stream) => {
        const send = (e: AssistantEvent) => stream.writeSSE({ event: e.type, data: JSON.stringify(e) });
        try {
          await assistant.chat(req, send, owner);
        } catch (e) {
          console.error("[galú]", e);
          await send({ type: "error", message: "Galú no está disponible ahora" });
        }
      });
    })
    .post("/log", async (c) => {
      const req = parse(AssistantRulesLogSchema, await c.req.json());
      if (!limiter.take(clientIp(c)))
        return c.json(
          { error: { code: "too_many_requests", message: "Muchas preguntas seguidas: probá en unos minutos" } },
          429,
        );
      await assistant.logRules(req, ownerOf(c, secure));
      return c.body(null, 204);
    });
}

const NOBODY: ChatOwner = { userId: null, cartToken: null };

/** La cuenta o la bolsa de la charla; la invitada sin bolsa recibe su cookie acá (si después compra, cuenta como venta). */
function ownerOf(c: Context<CartVars>, secure: boolean): ChatOwner {
  if (c.get("cartOwner") === undefined) return NOBODY;
  const o = ensureOwner(c, secure);
  return "userId" in o ? { userId: o.userId, cartToken: null } : { userId: null, cartToken: o.token };
}
