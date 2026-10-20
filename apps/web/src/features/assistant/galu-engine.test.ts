import { DEFAULT_POLICIES, type ProductSummary } from "@mini-galu/contracts";
import { describe, expect, it } from "vitest";
import { answer, type GaluReply, taughtReply } from "./galu-engine";
import { replyText } from "./galu-text";

let n = 0;
const product = (over: Partial<ProductSummary>): ProductSummary => {
  n++;
  return {
    slug: `producto-${n}`,
    name: `Vestido ${n}`,
    description: "",
    collection: { slug: "verano-2027", name: "Verano 2027" },
    color: { name: "Rojo", hex: "#A3302B" },
    fabric: "Lino",
    occasions: ["diario"],
    priceCents: 30_000_00,
    compareAtCents: null,
    tag: null,
    isAccessory: false,
    status: "published",
    images: [],
    variants: [{ size: "4", stock: 2, measures: null }],
    unitsSold: 0,
    rating: { average: 0, count: 0 },
    createdAt: `2026-0${n}-01T00:00:00.000Z`,
    ...over,
  };
};

const samanta = product({ slug: "samanta", name: "Vestido Samanta", fabric: "Lino lavado" });
const romantico = product({
  slug: "set-romantico-rojo",
  name: "Set Romántico Rojo",
  fabric: "Gabardina y puntilla",
  collection: { slug: "fiestas", name: "Fiestas" },
  variants: [{ size: "6", stock: 1, measures: null }],
});
const cleo = product({
  slug: "cleo",
  name: "Vestido Cleo",
  color: { name: "Salvia", hex: "#8B9A7C" },
  fabric: "Pana fina",
  collection: { slug: "otono-invierno-26", name: "Otoño · Invierno 26" },
  variants: [{ size: "4", stock: 0, measures: null }],
});
const nuevo = product({ slug: "lila", name: "Vestido Lila", color: { name: "Blanco", hex: "#fff" } });
const borrador = product({ slug: "secreto", name: "Vestido Secreto", status: "draft" });
const catalog = [samanta, romantico, cleo, nuevo, borrador];

const ask = (q: string, ctx: ProductSummary | null = null, care = async (_: string) => null as string | null) =>
  answer(q, catalog, ctx, DEFAULT_POLICIES, async () => null, care);
const said = (out: GaluReply[]) => replyText(out);
const shown = (out: GaluReply[]) => out.flatMap((r) => (r.kind === "cards" ? r.products.map((p) => p.slug) : []));

describe("Galú por reglas", () => {
  it("telas y cuidados: de la prenda que se mira (con los cuidados de la ficha) o de las telas del catálogo", async () => {
    const out = await ask("¿cómo se lava?", samanta, async (slug) => (slug === "samanta" ? "A mano, en frío." : null));
    expect(said(out)).toContain("es de lino lavado. Cuidados: A mano, en frío.");
    expect(said(await ask("¿de qué tela son?"))).toContain("lino lavado, gabardina y puntilla, pana fina y lino");
    const pana = await ask("tienen algo de pana?");
    expect(shown(pana)).toEqual([]);
    expect(said(pana)).toContain("En pana no me queda nada");
    expect(shown(await ask("algo de gabardina en talle 6"))).toEqual(["set-romantico-rojo"]);
  });

  it("colores del catálogo: 'rojo' es un color, no el Set Romántico; 'verde' trae el salvia", async () => {
    const rojo = await ask("¿tenés algo rojo?");
    expect(said(rojo)).toContain("En rojo tengo estos");
    expect(shown(rojo)).toEqual(["samanta", "set-romantico-rojo"]);
    expect(said(await ask("algo verde"))).toContain("En verde no me queda nada");
    expect(said(await ask("¿qué colores hay?"))).toContain("rojo, salvia y blanco");
    expect(shown(await ask("rojo en talle 6"))).toEqual(["set-romantico-rojo"]);
  });

  it("colecciones y lo más nuevo, sin borradores ni prendas agotadas", async () => {
    const cols = said(await ask("¿qué colecciones tienen?"));
    expect(cols).toContain("Verano 2027, Fiestas y Otoño · Invierno 26");
    expect(said(await ask("lo de otoño invierno"))).toContain("De Otoño · Invierno 26 no me queda nada");
    expect(shown(await ask("¿qué hay de la colección verano 2027?"))).toEqual(["samanta", "lila"]);
    expect(shown(await ask("¿qué hay de nuevo?"))).toEqual(["lila", "set-romantico-rojo", "samanta"]);
  });

  it("cambios y retiro con los datos de Tienda y pagos", async () => {
    const cambio = said(await ask("le quedó chico, ¿lo puedo cambiar?"));
    expect(cambio).toContain(`tenés ${DEFAULT_POLICIES.exchangeDays} días`);
    expect(cambio).toContain("Cambios y devoluciones");
    expect(said(await ask("¿puedo pasar a buscarlo?"))).toContain(
      `Podés retirar gratis en el taller, en ${DEFAULT_POLICIES.workshop.city}`,
    );
    const sinTaller = await answer("¿hacen retiro?", catalog, null, {
      ...DEFAULT_POLICIES,
      methods: { ...DEFAULT_POLICIES.methods, taller: false },
    });
    expect(replyText(sinTaller)).toContain("no tenemos retiro en el taller");
  });

  it("lo que ya sabía sigue igual y lo desconocido va a 'Enseñale'", async () => {
    expect(shown(await ask("¿qué hay en talle 4?"))).toEqual(["samanta", "lila"]);
    expect(said(await ask("¿dónde está mi pedido?"))).toContain("Pasame el número de tu pedido");
    const unknown = await ask("¿abren los feriados?");
    expect(unknown).toMatchObject([{ kind: "text", unanswered: true }]);
  });

  it("lo enseñado se muestra tal cual", () => {
    expect(replyText(taughtReply("Por ahora no.\nEscribinos."))).toBe("Por ahora no.\nEscribinos.");
  });
});
