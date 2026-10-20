import type { AssistantEvent, InstallmentPlan, PublicTracking } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { makeProduct } from "../../catalog/testing/fixtures";
import { MAX_TOOL_ROUNDS } from "../domain/conversation";
import {
  FixedInstallments,
  FixedShipping,
  MemoryOrders,
  memoryAssistant,
  memoryCatalog,
  ScriptedLlm,
} from "../testing/in-memory";
import { AssistantService } from "./assistant-service";
import { assistantTools } from "./tools";

const samanta = makeProduct({
  slug: "samanta",
  name: "Vestido Samanta",
  occasions: ["cumple", "fiesta"],
  priceCents: 45_000_00,
  variants: [
    { size: "4", stock: 2, measures: { largo: 50 } },
    { size: "6", stock: 0, measures: { largo: 55 } },
  ],
});
const cleo = makeProduct({
  slug: "cleo",
  name: "Vestido Cleo",
  color: { name: "Salvia", hex: "#9DAA8C" },
  occasions: ["bautismo"],
  variants: [{ size: "6", stock: 1, measures: null }],
});
const borrador = makeProduct({ slug: "corazon-pana", name: "Vestido Corazón", status: "draft" });

const pedido: PublicTracking = {
  number: "MG-1042",
  status: "en_camino",
  shippingMethod: "domicilio",
  createdAt: "2026-10-01T12:00:00.000Z",
  paidAt: "2026-10-01T12:05:00.000Z",
  totalCents: 45_000_00,
  items: [],
  destination: "Palermo, CABA",
  recipient: "Lucía F.",
  shipment: { carrier: "Andreani", trackingNumber: "360000001", url: null },
  stops: [
    { title: "Pago aprobado", detail: "1 oct", done: true },
    { title: "Entregado", detail: "Llega en 2 días", done: false },
  ],
  log: [{ title: "En tránsito", detail: "Centro de distribución", at: "2026-10-02T10:00:00.000Z" }],
  payUrl: null,
};

function setup(steps: ConstructorParameters<typeof ScriptedLlm>[0], plan?: InstallmentPlan) {
  const llm = new ScriptedLlm(steps);
  const catalog = memoryCatalog([samanta, cleo, borrador]);
  const payments = new FixedInstallments(plan);
  const tools = assistantTools({
    catalog,
    orders: new MemoryOrders([pedido]),
    shipping: new FixedShipping(),
    payments,
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
    }),
    memoryAssistant(),
  );
  return { llm, svc, payments };
}

async function ask(svc: AssistantService, text: string, productSlug?: string) {
  const events: AssistantEvent[] = [];
  await svc.chat({ messages: [{ role: "user", text }], productSlug }, (e) => {
    events.push(e);
  });
  const text_ = events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("");
  return { events, text: text_, cards: events.find((e) => e.type === "products") };
}

describe("Galú responde con tools sobre el stock real", () => {
  it("busca por talle, le pasa el resultado al modelo y muestra esas prendas como tarjetas", async () => {
    const { llm, svc } = setup([
      { toolCalls: [{ name: "buscar_prendas", input: { talle: "6" } }] },
      { text: "En talle 6 tengo el Vestido Cleo, ¡es el último!" },
    ]);
    const r = await ask(svc, "¿Qué hay en talle 6?");
    expect(r.text).toBe("En talle 6 tengo el Vestido Cleo, ¡es el último!");
    expect(r.cards).toMatchObject({ type: "products", size: "6", products: [{ slug: "cleo" }] });
    expect(r.events.at(-1)).toEqual({ type: "done" });
    // el modelo recibió el resultado de la tool (solo Cleo tiene stock en 6) en la segunda vuelta
    const tool = llm.calls[1]?.turns.at(-1);
    expect(tool).toMatchObject({ role: "tool", results: [{ name: "buscar_prendas", isError: false }] });
    const content = JSON.parse(tool?.role === "tool" ? (tool.results[0]?.content ?? "") : "");
    expect(content.prendas.map((p: { slug: string }) => p.slug)).toEqual(["cleo"]);
    expect(content.prendas[0].precio).toBe("$30.000");
  });

  it("el system prompt lista solo las publicadas y sabe qué ficha se está mirando", async () => {
    const { llm, svc } = setup([{ text: "¡Sí!" }]);
    await ask(svc, "¿Hay este en talle 4?", "samanta");
    const system = llm.calls[0]?.system ?? "";
    expect(system).toContain("samanta: Vestido Samanta");
    expect(system).not.toContain("corazon-pana");
    expect(system).toContain('mirando la ficha de "Vestido Samanta"');
    expect(llm.calls[0]?.tools.map((t) => t.name)).toEqual([
      "buscar_prendas",
      "ver_prenda",
      "talle_para",
      "avisar_talle",
      "seguir_pedido",
      "cotizar_envio",
      "cuotas",
      "no_lo_se",
    ]);
  });

  it("ver_prenda encuentra por nombre, no muestra borradores y los errores vuelven al modelo", async () => {
    const { llm, svc } = setup([
      {
        toolCalls: [
          { name: "ver_prenda", input: { prenda: "el Samanta" } },
          { name: "ver_prenda", input: { prenda: "corazon-pana" } },
          { name: "talle_para", input: {} },
        ],
      },
      { text: "El Samanta está $45.000." },
    ]);
    const r = await ask(svc, "¿Cuánto sale el Samanta?");
    const results = llm.calls[1]?.turns.at(-1);
    if (results?.role !== "tool") throw new Error("faltan resultados");
    expect(JSON.parse(results.results[0]?.content ?? "")).toMatchObject({
      slug: "samanta",
      precio: "$45.000",
      talles_con_stock: ["4"],
    });
    expect(results.results[1]?.content).toContain("No encontré");
    expect(results.results[2]).toMatchObject({ isError: false });
    expect(results.results[2]?.content).toContain("Necesito la edad o la altura");
    expect(r.cards).toMatchObject({ products: [{ slug: "samanta" }] });
  });

  it("parámetros inválidos o tools inexistentes no rompen: el modelo recibe el error", async () => {
    const { llm, svc } = setup([
      {
        toolCalls: [
          { name: "buscar_prendas", input: { talle: "12" } },
          { name: "borrar_todo", input: {} },
        ],
      },
      { text: "Los talles van de 12 meses a 10." },
    ]);
    const r = await ask(svc, "¿talle 12?");
    const results = llm.calls[1]?.turns.at(-1);
    if (results?.role !== "tool") throw new Error("faltan resultados");
    expect(results.results.map((x) => x.isError)).toEqual([true, true]);
    expect(r.cards).toBeUndefined();
  });

  it("acepta lo que mandan los modelos chicos: números como texto y null en opcionales", async () => {
    const { llm, svc } = setup([
      {
        toolCalls: [
          { name: "talle_para", input: { edad: "5", altura_cm: null } },
          { name: "buscar_prendas", input: { talle: 4, precio_max: "50000", color: null } },
        ],
      },
      { text: "Le va el talle 6." },
    ]);
    await ask(svc, "Mi nena tiene 5 años");
    const results = llm.calls[1]?.turns.at(-1);
    if (results?.role !== "tool") throw new Error("faltan resultados");
    expect(JSON.parse(results.results[0]?.content ?? "").talle).toBe("6");
    expect(JSON.parse(results.results[1]?.content ?? "").total).toBe(1);
  });

  it("seguimiento sin datos privados y cotización de envío por CP", async () => {
    const { llm, svc } = setup([
      {
        toolCalls: [
          { name: "seguir_pedido", input: { numero: "mg-1042" } },
          { name: "seguir_pedido", input: { numero: "MG-9999" } },
          { name: "cotizar_envio", input: { codigo_postal: "C1414" } },
        ],
      },
      { text: "Tu pedido está en camino." },
    ]);
    await ask(svc, "¿Dónde está el MG-1042? Vivo en C1414");
    const results = llm.calls[1]?.turns.at(-1);
    if (results?.role !== "tool") throw new Error("faltan resultados");
    const track = JSON.parse(results.results[0]?.content ?? "");
    expect(track).toMatchObject({ numero: "MG-1042", estado: "En camino", destino: "Palermo, CABA" });
    expect(track.proximo_paso).toContain("Entregado");
    expect(results.results[0]?.content).not.toContain("Lucía");
    expect(results.results[1]?.content).toContain("No encontramos");
    const quote = JSON.parse(results.results[2]?.content ?? "");
    expect(quote.codigo_postal).toBe("1414");
    expect(quote.opciones[0]).toMatchObject({ costo: "$8.500" });
    expect(quote.opciones[2]).toMatchObject({ costo: "gratis" });
  });

  it("cuotas: el plan real de Mercado Pago por prenda o por monto, sin prometer las que no hay", async () => {
    const { llm, svc, payments } = setup([
      {
        toolCalls: [
          { name: "cuotas", input: { prenda: "el Samanta" } },
          { name: "cuotas", input: { monto: "60000", prenda: null } },
          { name: "cuotas", input: { prenda: "corazon-pana" } },
          { name: "cuotas", input: {} },
        ],
      },
      { text: "El Samanta va en 3 cuotas sin interés de $15.000." },
    ]);
    await ask(svc, "¿En cuántas cuotas puedo pagar el Samanta?");
    const results = llm.calls[1]?.turns.at(-1);
    if (results?.role !== "tool") throw new Error("faltan resultados");
    expect(JSON.parse(results.results[0]?.content ?? "")).toMatchObject({
      prenda: "Vestido Samanta",
      monto: "$45.000",
      sin_interes: { cuotas: 3, de: "$15.000" },
      hasta_cuotas: 12,
      resumen: "3 cuotas sin interés de $15.000",
    });
    expect(JSON.parse(results.results[1]?.content ?? "")).toMatchObject({ monto: "$60.000" });
    expect(results.results[2]?.content).toContain("No encontré");
    expect(results.results[3]?.content).toContain("Necesito la prenda o el monto");
    expect(payments.asked).toEqual([45_000_00, 60_000_00]);

    const sinPlan = setup([{ toolCalls: [{ name: "cuotas", input: { monto: 30000 } }] }, { text: "Un pago." }], {
      interestFree: 1,
      max: 1,
    });
    await ask(sinPlan.svc, "¿cuotas?");
    const r = sinPlan.llm.calls[1]?.turns.at(-1);
    if (r?.role !== "tool") throw new Error("faltan resultados");
    expect(JSON.parse(r.results[0]?.content ?? "")).toMatchObject({ sin_interes: "no hay", hasta_cuotas: 1 });
    expect(r.results[0]?.content).toContain("Solo en un pago");
  });

  it("corta las rondas de tools: la última vuelta va sin tools y tiene que contestar", async () => {
    const loop = { toolCalls: [{ name: "talle_para", input: { edad: 3 } }] };
    const { llm, svc } = setup([...Array(MAX_TOOL_ROUNDS).fill(loop), { text: "Talle 4." }]);
    const r = await ask(svc, "talle?");
    expect(llm.calls).toHaveLength(MAX_TOOL_ROUNDS + 1);
    expect(llm.calls.at(-1)?.tools).toEqual([]);
    expect(r.text).toBe("Talle 4.");
  });

  it("si el modelo no escribe nada, pide reformular (nunca queda en blanco)", async () => {
    const { svc } = setup([{ text: "" }]);
    const r = await ask(svc, "hola");
    expect(r.text).toContain("no me salió la respuesta");
  });

  it("el texto antes de una tool se separa del que sigue y la charla previa viaja al modelo", async () => {
    const { llm, svc } = setup([
      { text: "Dejame ver.", toolCalls: [{ name: "buscar_prendas", input: { ocasion: "bautismo" } }] },
      { text: "Para bautismo, el Cleo." },
    ]);
    const events: AssistantEvent[] = [];
    await svc.chat(
      {
        messages: [
          { role: "user", text: "hola" },
          { role: "assistant", text: "¡Hola! ¿Para quién buscás?" },
          { role: "user", text: "algo para un bautismo" },
        ],
      },
      (e) => {
        events.push(e);
      },
    );
    expect(events.flatMap((e) => (e.type === "text" ? [e.delta] : [])).join("")).toBe(
      "Dejame ver.\n\nPara bautismo, el Cleo.",
    );
    expect(llm.calls[0]?.turns.map((t) => t.role)).toEqual(["user", "assistant", "user"]);
  });
});
