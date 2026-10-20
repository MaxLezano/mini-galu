import type { AssistantEvent } from "@mini-galu/contracts";
import { questionKey } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { makeProduct } from "../../catalog/testing/fixtures";
import { NotFoundError } from "../../shared/domain/errors";
import { groupPending } from "../domain/teaching";
import {
  FixedInstallments,
  FixedShipping,
  MemoryOrders,
  memoryAssistant,
  memoryCatalog,
  ScriptedLlm,
} from "../testing/in-memory";
import { AssistantAdminService } from "./assistant-admin-service";
import { AssistantService } from "./assistant-service";
import type { ChatOwner } from "./ports";
import { assistantTools } from "./tools";

const samanta = makeProduct({
  slug: "samanta",
  name: "Vestido Samanta",
  variants: [{ size: "4", stock: 2, measures: null }],
});
const agotado = makeProduct({
  slug: "rebeca",
  name: "Vestido Rebeca",
  variants: [{ size: "2", stock: 0, measures: null }],
});

const CONV = "7d1f2a4e-0b6c-4c39-9a52-5f7f8d3c1a01";
const OTHER = "1b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f8";
const NOW = new Date("2026-10-14T15:00:00.000Z");

function setup(steps: ConstructorParameters<typeof ScriptedLlm>[0]) {
  let now = NOW;
  const clock = () => now;
  const llm = new ScriptedLlm(steps);
  const catalog = memoryCatalog([samanta, agotado]);
  const memory = memoryAssistant();
  const tools = assistantTools({
    catalog,
    orders: new MemoryOrders(),
    shipping: new FixedShipping(),
    payments: new FixedInstallments(),
  });
  const svc = new AssistantService(
    llm,
    tools,
    catalog,
    async () => ({
      workshop: "Villa Crespo",
      freeShippingFrom: "$90.000",
      exchangeDays: 30,
      pickup: "Lun a vie · 10 a 13 y 16 a 19 h · Sáb · 10 a 13 h",
      delivery: "Envíos a todo el país con Andreani (a domicilio o a sucursal) o retiro gratis en el taller.",
      giftcardRange: "$5.000 a $500.000",
      whatsapp: "https://wa.me/5491100000000",
      vars: { whatsapp: "381 319-5264", dias_cambio: "2 días" },
    }),
    memory,
    clock,
  );
  const admin = new AssistantAdminService(
    memory,
    () => "guion",
    (n) => `MG-${n}`,
    clock,
  );
  const ask = async (text: string, conversationId: string | null = CONV, owner?: ChatOwner) => {
    const events: AssistantEvent[] = [];
    await svc.chat(
      { messages: [{ role: "user", text }], conversationId: conversationId ?? undefined },
      (e) => {
        events.push(e);
      },
      owner,
    );
    return events;
  };
  return { llm, svc, memory, admin, ask, catalog, later: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe("Galú guarda las charlas para el panel", () => {
  it("guarda la pregunta y la respuesta a nombre de la cuenta o la bolsa", async () => {
    const { memory, admin, ask } = setup([{ text: "¡Hola! ¿En qué te ayudo?" }]);
    await ask("hola", CONV, { userId: null, cartToken: "tok" });
    expect(memory.log.conversations).toMatchObject([{ id: CONV, owner: { cartToken: "tok" } }]);
    const panel = await admin.admin();
    expect(panel.conversations).toMatchObject([
      {
        id: CONV,
        outcome: null,
        messages: [
          { role: "user", text: "hola", unanswered: null },
          { role: "assistant", text: "¡Hola! ¿En qué te ayudo?", unanswered: null },
        ],
      },
    ]);
    expect(panel.stats).toMatchObject({ chats: 1, unanswered: 0 });
  });

  it("sin id de charla no guarda nada", async () => {
    const { memory, ask } = setup([{ text: "Hola" }]);
    await ask("hola", null);
    expect(memory.log.conversations).toEqual([]);
  });

  it("lo que no sabe queda pendiente en 'Enseñale', agrupado por pregunta", async () => {
    const { admin, ask, llm } = setup([
      { toolCalls: [{ name: "no_lo_se", input: { pregunta: "¿Hacen vestidos de comunión a medida?" } }] },
      { text: "Eso no lo sé todavía. ¿Le escribís a Gaby por WhatsApp?" },
      { toolCalls: [{ name: "no_lo_se", input: { pregunta: "hacen vestidos de comunion a medida" } }] },
      { text: "No lo sé." },
    ]);
    await ask("Hacen vestidos de comunión a medida?");
    await ask("y a medida para comunión?", OTHER);
    // el modelo recibe "anotado" y sigue
    const tool = llm.calls[1]?.turns.at(-1);
    expect(tool).toMatchObject({ role: "tool", results: [{ name: "no_lo_se", isError: false }] });
    const panel = await admin.admin();
    expect(panel.pending).toEqual([{ question: expect.stringMatching(/comuni/), times: 2, lastAt: NOW.toISOString() }]);
    expect(panel.stats.unanswered).toBe(2);
    expect(panel.conversations.map((c) => c.outcome)).toEqual(["sin_respuesta", "sin_respuesta"]);
    expect(panel.conversations[0]?.messages[1]?.unanswered).toMatch(/medida/);
    // el resumen, la campana y el menú usan la versión corta
    expect(await admin.overview()).toEqual({ chats: 2, bought: 0, pending: panel.pending });
  });

  it("sin modelo, la tienda manda lo que respondió por reglas: queda igual y lo que no supo va a 'Enseñale'", async () => {
    const { svc, admin } = setup([]);
    await svc.logRules(
      {
        conversationId: CONV,
        question: "¿Qué hay en talle 4?",
        answer: "En talle 4 tengo 1 modelo.",
        unanswered: false,
      },
      { userId: "u1", cartToken: null },
    );
    await svc.logRules({
      conversationId: CONV,
      productSlug: "samanta",
      question: "¿Hacen comunión a medida?",
      answer: "Eso todavía no lo sé.",
      unanswered: true,
    });
    const panel = await admin.admin();
    expect(panel.conversations).toMatchObject([
      {
        id: CONV,
        outcome: "sin_respuesta",
        messages: [
          { role: "user", text: "¿Qué hay en talle 4?", unanswered: null },
          { role: "assistant", text: "En talle 4 tengo 1 modelo.", unanswered: null },
          { role: "user", text: "¿Hacen comunión a medida?", unanswered: null },
          { role: "assistant", text: "Eso todavía no lo sé.", unanswered: "¿Hacen comunión a medida?" },
        ],
      },
    ]);
    expect(panel.pending).toEqual([{ question: "¿Hacen comunión a medida?", times: 1, lastAt: NOW.toISOString() }]);
  });

  it("enseñarle: la respuesta entra en sus instrucciones y la pregunta deja de estar pendiente", async () => {
    const { admin, ask, llm } = setup([
      { toolCalls: [{ name: "no_lo_se", input: { pregunta: "¿Hacen a medida?" } }] },
      { text: "No sé." },
      { text: "Por ahora no hacemos a medida." },
    ]);
    await ask("¿Hacen a medida?");
    const after = await admin.teach({
      question: "¿Hacen a medida?",
      answer: "Por ahora no hacemos a medida, pero el Samanta es ideal para comunión.",
    });
    expect(after.pending).toEqual([]);
    expect(after.facts).toMatchObject([{ question: "¿Hacen a medida?" }]);
    expect(after.conversations[0]).toMatchObject({ outcome: null, messages: [{}, { taught: true }] });
    await ask("¿hacen a medida?", OTHER);
    const system = llm.calls.at(-1)?.system ?? "";
    expect(system).toContain("Lo que te enseñó Gaby");
    expect(system).toContain('"¿Hacen a medida?" → Por ahora no hacemos a medida');

    const id = after.facts[0]?.id ?? "";
    expect((await admin.forget(id)).facts).toEqual([]);
    await expect(admin.forget(id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("sin modelo, lo enseñado responde antes que las reglas (con las variables de Tienda y pagos)", async () => {
    const { svc, admin } = setup([]);
    await admin.teach({ question: "¿Hacen envíos al exterior?", answer: "Por ahora no. Consultá al {whatsapp}." });
    expect(await svc.taught("hola! hacen envio al exterior? a Uruguay")).toEqual({
      question: "¿Hacen envíos al exterior?",
      answer: "Por ahora no. Consultá al 381 319-5264.",
    });
    expect(await svc.taught("¿Cuánto sale el envío a Córdoba?")).toBeNull();
  });

  it("corregir lo enseñado: cambia la respuesta y, si la pregunta es otra, también responde esa", async () => {
    const { svc, admin } = setup([]);
    await svc.logRules({ conversationId: CONV, question: "¿Tienen local?", answer: "No sé.", unanswered: true });
    const taught = await admin.teach({ question: "¿Hacen a medida?", answer: "No." });
    const id = taught.facts[0]?.id ?? "";
    expect(taught.pending).toHaveLength(1);
    const after = await admin.edit(id, { question: "¿Tienen local?", answer: "Somos un taller: se retira con turno." });
    expect(after.facts).toMatchObject([
      { id, question: "¿Tienen local?", answer: "Somos un taller: se retira con turno." },
    ]);
    expect(after.pending).toEqual([]);
    await expect(admin.edit("nada", { question: "¿Algo?", answer: "Nada." })).rejects.toBeInstanceOf(NotFoundError);
  });

  it("los ajustes cambian el tono, el WhatsApp y las tarjetas sin stock", async () => {
    const { admin, ask, llm } = setup([
      { text: "Buenas tardes." },
      { toolCalls: [{ name: "ver_prenda", input: { prenda: "rebeca" } }] },
      { text: "El Rebeca no tiene stock." },
      { toolCalls: [{ name: "ver_prenda", input: { prenda: "rebeca" } }] },
      { text: "El Rebeca no tiene stock." },
    ]);
    await admin.updateSettings({
      whatsappFallback: false,
      giftcardWhenNoSize: false,
      onlyInStock: true,
      tone: "formal",
    });
    await ask("buenas");
    const system = llm.calls[0]?.system ?? "";
    expect(system).toContain("tratás de usted");
    expect(system).not.toContain("wa.me");
    expect(system).not.toContain("gift card (/giftcards) para que elijan");

    // solo con stock: el modelo se entera del agotado, pero no sale como tarjeta
    const hidden = await ask("¿y el Rebeca?");
    expect(hidden.find((e) => e.type === "products")).toBeUndefined();
    await admin.updateSettings({
      whatsappFallback: true,
      giftcardWhenNoSize: true,
      onlyInStock: false,
      tone: "calido",
    });
    const shown = await ask("¿y el Rebeca?");
    expect(shown.find((e) => e.type === "products")).toMatchObject({ products: [{ slug: "rebeca" }] });
    expect(llm.calls.at(-1)?.system).toContain("wa.me");
  });

  it("anota el aviso de talle en la lista de espera y el panel lo cuenta como 'Pidió aviso'", async () => {
    const pedir = (contacto: string, canal = "email") => ({
      toolCalls: [{ name: "avisar_talle", input: { prenda: "rebeca", talle: 2, canal, contacto } }],
    });
    const { admin, ask, llm, catalog } = setup([
      pedir("no-es-un-mail"),
      { text: "Pasame un mail válido" },
      pedir("vale@mail.com"),
      { text: "¡Listo! Te avisamos" },
      {
        toolCalls: [
          { name: "avisar_talle", input: { prenda: "samanta", talle: "4", canal: "email", contacto: "vale@mail.com" } },
        ],
      },
      { text: "Hay stock" },
    ]);
    await ask("avisame del Rebeca en 2: no-es-un-mail");
    expect(llm.calls[1]?.turns.at(-1)).toMatchObject({
      role: "tool",
      results: [{ content: expect.stringContaining("no parece válido") }],
    });
    expect((await admin.admin()).stats.sizeAlerts).toBe(0);

    await ask("vale@mail.com", OTHER);
    expect(llm.calls[3]?.turns.at(-1)).toMatchObject({
      results: [{ isError: false, content: expect.stringContaining('"lugar_en_la_lista":1') }],
    });
    // queda en la lista de espera de verdad: una segunda vez no la duplica
    expect(
      await catalog.joinWaitlist({ slug: "rebeca", size: "2", channel: "email", contact: "vale@mail.com" }),
    ).toEqual({
      created: false,
      position: 1,
    });

    // con stock no se anota: el caso de uso lo rechaza y no cuenta
    await ask("¿y el Samanta en 4?", "2b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f9");
    expect(llm.calls[5]?.turns.at(-1)).toMatchObject({
      results: [{ isError: true, content: expect.stringContaining("Hay stock") }],
    });

    const panel = await admin.admin();
    expect(panel.stats.sizeAlerts).toBe(1);
    const c = panel.conversations.find((x) => x.id === OTHER);
    expect(c?.outcome).toBe("aviso");
    expect(c?.messages.find((m) => m.role === "assistant")?.sizeAlert).toBe("Vestido Rebeca · talle 2");
    expect(panel.conversations.find((x) => x.id === CONV)?.outcome).toBeNull();
  });

  it("terminó en compra si se pagó un pedido de esa cuenta o bolsa; los KPIs comparan con la semana anterior", async () => {
    const { admin, ask, memory, later } = setup([{ text: "a" }, { text: "b" }, { text: "c" }]);
    await ask("hola", OTHER);
    later(8 * 86_400_000);
    await ask("hola");
    await ask("¿talle 4?", "2b2c3d4e-5f60-4a71-8b92-a3b4c5d6e7f9");
    memory.log.orders.set(CONV, { number: 1044, totalCents: 55_900_00 });
    const panel = await admin.admin();
    expect(panel.stats).toEqual({
      chats: 2,
      chatsBefore: 1,
      bought: 1,
      boughtCents: 55_900_00,
      unanswered: 0,
      sizeAlerts: 0,
    });
    expect(panel.conversations.find((c) => c.id === CONV)).toMatchObject({
      outcome: "compra",
      order: { number: "MG-1044", totalCents: 55_900_00 },
    });
    expect(panel.settings).toEqual({
      whatsappFallback: true,
      giftcardWhenNoSize: true,
      onlyInStock: true,
      tone: "calido",
    });
    expect(panel.provider).toBe("guion");
    expect(await admin.overview()).toEqual({ chats: 2, bought: 1, pending: [] });
  });
});

describe("preguntas pendientes", () => {
  it("misma pregunta con otras mayúsculas, tildes o signos cuenta como una", () => {
    expect(questionKey("¿Hacen vestidos de COMUNIÓN?")).toBe(questionKey("hacen vestidos de comunion"));
    const at = (h: number) => new Date(Date.UTC(2026, 9, 14, h));
    expect(
      groupPending([
        { id: "1", question: "¿Talle 12?", at: at(10) },
        { id: "2", question: "¿Hacen a medida?", at: at(11) },
        { id: "3", question: "hacen a medida", at: at(12) },
        { id: "4", question: "?!", at: at(12) },
      ]),
    ).toEqual([
      { question: "hacen a medida", times: 2, lastAt: at(12).toISOString(), ids: ["2", "3"] },
      { question: "¿Talle 12?", times: 1, lastAt: at(10).toISOString(), ids: ["1"] },
    ]);
  });
});
