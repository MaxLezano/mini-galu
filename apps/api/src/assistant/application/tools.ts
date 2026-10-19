import {
  CatalogQuerySchema,
  ContactSchema,
  formatARS,
  GARMENT_SIZES,
  installment,
  installmentsLabel,
  OCCASIONS,
  type Occasion,
  ORDER_STATUSES,
  type ProductSummary,
  recommendSize,
  SHIPPING_METHODS,
  SIZES,
  type Size,
  SORTS,
  type Sort,
} from "@mini-galu/contracts";
import { z } from "zod";
import type { ToolSpec } from "../domain/conversation";
import type { AssistantCatalog, AssistantOrders, AssistantPayments, AssistantShipping } from "./ports";

/**
 * Lo que devuelve una tool: el texto para el modelo y, si hay, las prendas para mostrar como tarjetas y el aviso de
 * talle que quedó anotado (para el panel).
 */
export type ToolOutput = { content: string; products?: ProductSummary[]; size?: Size | null; sizeAlert?: string };

type Tool<S extends z.ZodType> = {
  name: string;
  description: string;
  input: S;
  run(input: z.output<S>, opts: ToolOptions): Promise<ToolOutput>;
};

/** Ajustes del panel que cambian lo que devuelven las tools. */
export type ToolOptions = { onlyInStock: boolean };

const tool = <S extends z.ZodType>(t: Tool<S>) => t;

/** Opcional tolerante: los modelos chicos mandan null, "" o números como texto ("6", "50000"). */
const opt = <S extends z.ZodType>(s: S) =>
  z.preprocess((v) => (v === null || v === "" ? undefined : typeof v === "number" ? String(v) : v), s.optional());
const optNumber = (s: z.ZodNumber) =>
  z.preprocess(
    (v) => (v === null || v === "" ? undefined : typeof v === "string" ? Number(v.replace(/[^\d.]/g, "")) : v),
    s.optional(),
  );

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const sizesWithStock = (p: ProductSummary) => p.variants.filter((v) => v.stock > 0).map((v) => v.size);

/** Una prenda resumida para el modelo (lo justo para responder, sin fotos ni ids). */
function brief(p: ProductSummary) {
  return {
    slug: p.slug,
    nombre: p.name,
    precio: formatARS(p.priceCents),
    ...(p.compareAtCents && p.compareAtCents > p.priceCents ? { antes: formatARS(p.compareAtCents) } : {}),
    coleccion: p.collection.name,
    color: p.color.name,
    tela: p.fabric,
    ocasiones: p.occasions.map((o) => OCCASIONS[o]),
    stock_por_talle: Object.fromEntries(p.variants.map((v) => [v.size, v.stock])),
    ...(p.isAccessory ? { accesorio: true } : {}),
  };
}

const MAX_RESULTS = 6;

/** Las tools de Galú, cada una sobre un caso de uso. El modelo elige cuál pedir; acá se validan y se corren. */
export function assistantTools(deps: {
  catalog: AssistantCatalog;
  orders: AssistantOrders;
  shipping: AssistantShipping;
  payments: AssistantPayments;
}) {
  const findProduct = async (ref: string) => {
    const bySlug = await deps.catalog.product(ref.trim().toLowerCase());
    if (bySlug) return bySlug;
    // "el Samanta", "vestido catalina rojo": se busca por nombre entre las publicadas
    const words = norm(ref)
      .split(/\s+/)
      .filter((w) => w.length > 2 && !["el", "la", "los", "las", "del", "vestido", "conjunto"].includes(w));
    const all = await deps.catalog.search(CatalogQuerySchema.parse({ instock: "0" }));
    const hit = all
      .map((p) => ({ p, score: words.filter((w) => norm(`${p.name} ${p.slug}`).includes(w)).length }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || a.p.name.length - b.p.name.length)[0];
    return hit ? deps.catalog.product(hit.p.slug) : null;
  };

  const tools = [
    tool({
      name: "buscar_prendas",
      description:
        "Busca prendas publicadas con stock real. Todos los filtros son opcionales. Devuelve hasta 6 prendas con precio y stock por talle; la tienda las muestra como tarjetas.",
      input: z.object({
        talle: opt(z.enum(SIZES)).describe("Talle con stock: 12m, 2, 4, 6, 8, 10 o Único (accesorios)"),
        ocasion: opt(z.enum(Object.keys(OCCASIONS) as [Occasion, ...Occasion[]])).describe(
          "diario, cumple, fiesta, bautismo, navidad, casamiento, comunion o regalo",
        ),
        color: opt(z.string().max(30)).describe("Color, por ejemplo rojo, blanco, salvia"),
        precio_max: optNumber(z.number().positive()).describe("Precio máximo en pesos (sin centavos)"),
        texto: opt(z.string().max(60)).describe("Palabras a buscar en el nombre o la descripción"),
        orden: opt(z.enum(Object.keys(SORTS) as [Sort, ...Sort[]])).describe(
          "new (más nuevos), asc (más baratos), desc (más caros), pop (más vendidos)",
        ),
        incluir_agotadas: z
          .preprocess((v) => (v === "true" ? true : v === null ? undefined : v), z.boolean().optional())
          .describe("true para ver también las que no tienen stock"),
      }),
      async run(i, opts) {
        const list = await deps.catalog.search(
          CatalogQuerySchema.parse({
            talle: i.talle,
            ocasion: i.ocasion,
            max: i.precio_max ? Math.round(i.precio_max * 100) : undefined,
            q: i.texto,
            sort: i.orden,
            instock: i.incluir_agotadas && !opts.onlyInStock ? "0" : undefined,
          }),
        );
        const color = i.color ? norm(i.color) : null;
        const found = color
          ? list.filter((p) => norm(p.color.name).includes(color) || color.includes(norm(p.color.name)))
          : list;
        const shown = found.slice(0, MAX_RESULTS);
        return {
          content: JSON.stringify({ total: found.length, prendas: shown.map(brief) }),
          products: shown,
          size: i.talle && i.talle !== "Único" ? i.talle : null,
        };
      },
    }),
    tool({
      name: "ver_prenda",
      description:
        "Detalle de una prenda por slug o por nombre: descripción, tela, cuidados, stock y medidas por talle, reseñas. Úsala para precio o stock de un modelo puntual.",
      input: z.object({ prenda: z.string().min(1).max(80).describe("Slug (samanta) o nombre (Vestido Samanta)") }),
      async run(i) {
        const p = await findProduct(i.prenda);
        if (!p) return { content: JSON.stringify({ error: `No encontré la prenda "${i.prenda}"` }) };
        return {
          content: JSON.stringify({
            ...brief(p),
            descripcion: p.description,
            cuidados: p.care,
            medidas_por_talle: Object.fromEntries(p.variants.map((v) => [v.size, v.measures])),
            talles_con_stock: sizesWithStock(p),
            reseñas: { promedio: p.rating.average, cantidad: p.rating.count, talle_justo: p.fitJustoPercent },
          }),
          products: [p],
          size: null,
        };
      },
    }),
    tool({
      name: "talle_para",
      description:
        "Talle recomendado según la edad (años) y/o la altura (cm) de la nena. Los talles van por edad y tienen holgura.",
      input: z.object({
        edad: optNumber(z.number().min(0).max(14)).describe("Edad en años (1 si tiene meses)"),
        altura_cm: optNumber(z.number().min(50).max(170)).describe("Altura en centímetros"),
      }),
      async run(i) {
        if (i.edad == null && i.altura_cm == null)
          return { content: JSON.stringify({ error: "Necesito la edad o la altura" }) };
        const talle = recommendSize(i.edad != null ? Math.round(i.edad) : null, i.altura_cm ?? null);
        return {
          content: JSON.stringify({
            talle,
            nota: `Cada modelo tiene su tabla de medidas en la ficha. Talles disponibles: ${GARMENT_SIZES.join(", ")}`,
          }),
        };
      },
    }),
    tool({
      name: "avisar_talle",
      description:
        "Anota a quien escribe en la lista de espera de una prenda agotada en un talle: le avisamos por email o WhatsApp cuando vuelva. Pedile el contacto antes; solo para talles sin stock.",
      input: z.object({
        prenda: z.string().min(1).max(80).describe("Slug o nombre de la prenda"),
        talle: z.preprocess((v) => (typeof v === "number" ? String(v) : v), z.enum(SIZES)).describe("Talle agotado"),
        canal: z.enum(["email", "whatsapp"]).describe("Por dónde avisarle"),
        contacto: z.coerce.string().min(1).max(120).describe("El email o el número de WhatsApp que dio"),
      }),
      async run(i) {
        const p = await findProduct(i.prenda);
        if (!p) return { content: JSON.stringify({ error: `No encontré la prenda "${i.prenda}"` }) };
        const contact = ContactSchema.safeParse({ channel: i.canal, contact: i.contacto });
        if (!contact.success)
          return {
            content: JSON.stringify({
              error: `${i.canal === "email" ? "Ese email" : "Ese WhatsApp"} no parece válido: pedíselo de nuevo`,
            }),
          };
        const r = await deps.catalog.joinWaitlist({ slug: p.slug, size: i.talle, ...contact.data });
        return {
          content: JSON.stringify({
            prenda: p.name,
            talle: i.talle,
            anotada: true,
            ya_estaba: !r.created,
            lugar_en_la_lista: r.position,
            aviso: i.canal === "email" ? "Le llega un mail cuando vuelva" : "Le llega un WhatsApp cuando vuelva",
          }),
          sizeAlert: `${p.name} · talle ${i.talle}`,
        };
      },
    }),
    tool({
      name: "seguir_pedido",
      description: "Estado de un pedido por su número (MG-1042) o el número de seguimiento de Andreani.",
      input: z.object({ numero: z.coerce.string().min(3).max(30) }),
      async run(i) {
        const t = await deps.orders.track(i.numero);
        if (!t) return { content: JSON.stringify({ error: "No encontramos ese pedido. Revisá el número (MG-…)." }) };
        const next = t.stops.find((s) => !s.done);
        return {
          content: JSON.stringify({
            numero: t.number,
            estado: ORDER_STATUSES[t.status].short,
            entrega: SHIPPING_METHODS[t.shippingMethod],
            destino: t.destination,
            ultimo_movimiento: t.log[0] ? `${t.log[0].title} · ${t.log[0].detail}` : null,
            proximo_paso: next ? `${next.title} · ${next.detail}` : null,
            seguimiento: `/seguimiento?pedido=${encodeURIComponent(t.number)}`,
          }),
        };
      },
    }),
    tool({
      name: "cotizar_envio",
      description: "Costo y opciones de envío para un código postal argentino (sin contar el envío gratis por monto).",
      input: z.object({ codigo_postal: z.coerce.string().regex(/^\s*[a-zA-Z]?\d{4}[a-zA-Z]{0,3}\s*$/, "CP inválido") }),
      async run(i) {
        const cp = i.codigo_postal.trim().replace(/\D/g, "");
        const o = await deps.shipping.options(cp);
        return {
          content: JSON.stringify({
            codigo_postal: cp,
            opciones: o.options.map((x) => ({
              forma: x.label,
              detalle: x.detail,
              costo: x.cents == null ? null : x.cents === 0 ? "gratis" : formatARS(x.cents),
            })),
          }),
        };
      },
    }),
    tool({
      name: "cuotas",
      description:
        "Cuotas con tarjeta de crédito (Mercado Pago) para una prenda o un monto: cuántas sin interés y hasta cuántas en total.",
      input: z.object({
        prenda: opt(z.string().min(1).max(80)).describe("Slug o nombre de la prenda"),
        monto: optNumber(z.number().positive().max(10_000_000)).describe("Monto en pesos, si no es una prenda"),
      }),
      async run(i) {
        const p = i.prenda ? await findProduct(i.prenda) : null;
        if (i.prenda && !p) return { content: JSON.stringify({ error: `No encontré la prenda "${i.prenda}"` }) };
        const cents = p ? p.priceCents : i.monto ? Math.round(i.monto * 100) : null;
        if (!cents) return { content: JSON.stringify({ error: "Necesito la prenda o el monto" }) };
        const plan = await deps.payments.installments(cents);
        return {
          content: JSON.stringify({
            ...(p ? { prenda: p.name } : {}),
            monto: formatARS(cents),
            sin_interes:
              plan.interestFree > 1
                ? { cuotas: plan.interestFree, de: formatARS(installment(cents, plan.interestFree)) }
                : "no hay",
            hasta_cuotas: plan.max,
            resumen:
              installmentsLabel(plan, cents, formatARS) ?? "Solo en un pago (crédito, débito o dinero en cuenta)",
            nota: "Las cuotas con interés dependen del banco: el total exacto se ve al cargar la tarjeta en el checkout.",
          }),
        };
      },
    }),
  ];

  const byName = new Map(tools.map((t) => [t.name, t as Tool<z.ZodType>]));

  return {
    specs: tools.map(
      (t): ToolSpec => ({
        name: t.name,
        description: t.description,
        parameters: (({ $schema: _, ...rest }) => rest)(
          z.toJSONSchema(t.input, { target: "draft-7" }) as Record<string, unknown>,
        ),
      }),
    ),
    /** Corre una tool pedida por el modelo; los errores vuelven como texto para que el modelo lo diga. */
    async run(
      name: string,
      input: unknown,
      opts: ToolOptions = { onlyInStock: true },
    ): Promise<ToolOutput & { isError: boolean }> {
      const t = byName.get(name);
      if (!t) return { content: `No existe la tool "${name}"`, isError: true };
      const parsed = t.input.safeParse(input ?? {});
      if (!parsed.success)
        return {
          content: `Parámetros inválidos: ${parsed.error.issues.map((x) => `${x.path.join(".")} ${x.message}`).join("; ")}`,
          isError: true,
        };
      return { ...(await t.run(parsed.data, opts)), isError: false };
    },
  };
}

export type AssistantTools = ReturnType<typeof assistantTools>;
