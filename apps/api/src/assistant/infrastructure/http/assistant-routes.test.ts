import { Hono } from "hono";
import { createMiddleware } from "hono/factory";
import { describe, expect, it } from "vitest";
import type { CartVars } from "../../../cart/infrastructure/http/cart-owner";
import { makeProduct } from "../../../catalog/testing/fixtures";
import { onError } from "../../../shared/http/errors";
import { AssistantService } from "../../application/assistant-service";
import { assistantTools } from "../../application/tools";
import {
  FixedInstallments,
  FixedShipping,
  MemoryOrders,
  memoryAssistant,
  memoryCatalog,
  ScriptedLlm,
} from "../../testing/in-memory";
import { assistantRoutes } from "./assistant-routes";

const CONV = "7d1f2a4e-0b6c-4c39-9a52-5f7f8d3c1a01";

function app(owner: CartVars["Variables"]["cartOwner"]) {
  const memory = memoryAssistant();
  const catalog = memoryCatalog([makeProduct({ slug: "samanta" })]);
  const svc = new AssistantService(
    new ScriptedLlm([{ text: "¡Hola!" }, { text: "¡Hola!" }]),
    assistantTools({
      catalog,
      orders: new MemoryOrders(),
      shipping: new FixedShipping(),
      payments: new FixedInstallments(),
    }),
    catalog,
    async () => ({
      workshop: "Villa Crespo",
      freeShippingFrom: "$90.000",
      exchangeDays: 30,
      pickup: "Lun a vie · 10 a 13 h",
      giftcardRange: "$5.000 a $500.000",
      whatsapp: "wa",
    }),
    memory,
  );
  // en app.ts va cartOwner (sesión o cookie mg_cart); acá se fija el resultado
  const owned = createMiddleware<CartVars>(async (c, next) => {
    c.set("cartOwner", owner);
    c.set("userId", owner && "userId" in owner ? owner.userId : null);
    await next();
  });
  const http = new Hono().use("/assistant/chat", owned).route("/assistant", assistantRoutes(svc)).onError(onError);
  const chat = (body: unknown) =>
    http.request("/assistant/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  return { memory, chat };
}

describe("POST /assistant/chat", () => {
  it("la invitada sin bolsa recibe su cookie y la charla queda a nombre de esa bolsa", async () => {
    const { memory, chat } = app(null);
    const res = await chat({ messages: [{ role: "user", text: "hola" }], conversationId: CONV });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("¡Hola!");
    const cookie = res.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^mg_cart=[\w-]+;/);
    const token = cookie.split(";")[0]?.split("=")[1];
    expect(memory.log.conversations).toMatchObject([{ id: CONV, owner: { userId: null, cartToken: token } }]);
  });

  it("con cuenta, a nombre de la cuenta; sin id de charla, no guarda ni crea cookie", async () => {
    const { memory, chat } = app({ userId: "u1" });
    await (await chat({ messages: [{ role: "user", text: "hola" }], conversationId: CONV })).text();
    expect(memory.log.conversations[0]?.owner).toEqual({ userId: "u1", cartToken: null });

    const guest = app(null);
    const res = await guest.chat({ messages: [{ role: "user", text: "hola" }] });
    await res.text();
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(guest.memory.log.conversations).toEqual([]);
  });

  it("un id de charla inválido se rechaza", async () => {
    const { chat } = app(null);
    const res = await chat({ messages: [{ role: "user", text: "hola" }], conversationId: "no-es-uuid" });
    expect(res.status).toBe(422);
  });
});
