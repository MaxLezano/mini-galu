import {
  DEFAULT_POLICIES,
  deliverySummary,
  discountPercent,
  formatARS,
  freeShippingFrom,
  GARMENT_SIZES,
  type InstallmentPlan,
  installment,
  ORDER_STATUSES,
  type ProductSummary,
  type PublicTracking,
  pickupHoursLabel,
  type Size,
  type StorePolicies,
  sizeLabel,
  whatsappUrl,
} from "@mini-galu/contracts";
import Link from "next/link";
import type { ReactNode } from "react";
import { headline } from "@/features/tracking/tracking-view";
import { sizesIn, stockOf, stripAccents, totalStock } from "@/lib/product";

/**
 * Galú por reglas sobre el catálogo REAL (stock y precios de la API), portado del mockup.
 * Desde la fase 7 responde el modelo de la API (api/assistant: LLM + tools); esto queda para cuando la API no
 * tiene modelo configurado (CI, local sin Ollama) o no responde, con la misma forma (textos + tarjetas).
 */
export type GaluReply =
  /** `unanswered`: no supo responder (la pregunta va a "Enseñale" en el panel). */
  | { kind: "text"; content: ReactNode; unanswered?: boolean }
  | { kind: "cards"; products: ProductSummary[]; size?: Size };

const text = (content: ReactNode): GaluReply => ({ kind: "text", content });
const cards = (products: ProductSummary[], size?: Size): GaluReply[] =>
  products.length ? [{ kind: "cards", products, size }] : [];

/** Link al WhatsApp de la tienda (el de Tienda y pagos → Datos de la tienda). */
const WA = (whatsapp: string, label = "escribile a Gaby") => (
  <a className="link" href={whatsappUrl(whatsapp)}>
    {label}
  </a>
);

/** Sugerencias al abrir Galú fuera de una ficha; la del precio nombra una prenda del catálogo de ese momento. */
export function defaultSuggestions(products: ProductSummary[]): string[] {
  const named = products.find((p) => !p.isAccessory && p.variants.some((v) => v.stock > 0));
  return [
    "¿Qué hay en talle 6?",
    "Algo para un cumple",
    ...(named ? [`¿Cuánto sale el ${named.name}?`] : []),
    "Regalo para una nena de 3",
    "¿Dónde está mi pedido?",
  ];
}

export function contextSuggestions(p: ProductSummary): string[] {
  const out = p.variants.find((v) => v.stock === 0)?.size;
  const last = p.name.split(" ").slice(-1)[0];
  return [
    `¿Hay talle ${out ?? sizesIn(p)[0] ?? "6"}?`,
    `¿Cuánto sale el ${last}?`,
    "Mi nena tiene 5 años, ¿qué talle?",
    "¿Cómo pago?",
  ];
}

export function greeting(ctx: ProductSummary | null): ReactNode {
  return ctx ? (
    <>
      ¡Hola! Veo que estás mirando el <b>{ctx.name}</b>. ¿Querés saber si hay tu talle?
    </>
  ) : (
    <>
      ¡Hola! Soy <b>Galú</b>, la asistente del taller.
      <br />
      Te ayudo a encontrar talle, ver stock, elegir un regalo o seguir tu pedido.
    </>
  );
}

const trackLink = (number: string, label = "Ver el seguimiento") => (
  <Link className="link" href={`/seguimiento?pedido=${encodeURIComponent(number)}`}>
    {label}
  </Link>
);

/** Galú por reglas con el pedido real (`GET /tracking/:code`, el mismo seguimiento público, sin calle ni apellido). */
export function orderReply(t: PublicTracking): GaluReply[] {
  const [before, strong, after] = headline(t.status, t.shippingMethod);
  const last = t.log[0];
  const next = t.stops.find((s) => !s.done);
  return [
    text(
      <>
        Tu pedido <b>#{t.number}</b> está <b>{ORDER_STATUSES[t.status].short.toLowerCase()}</b>: {before}
        {strong}
        {after}.{last ? ` Último movimiento: ${last.title}.` : ""}
        {next && t.status !== "entregado" ? ` Lo que sigue: ${next.title}.` : ""} {trackLink(t.number)}
      </>,
    ),
  ];
}

export function orderNotFound(code: string, whatsapp: string): GaluReply[] {
  return [
    text(
      <>
        No encontré el pedido <b>{code}</b>. Revisá el número (está en el mail de la compra y empieza con <b>MG-</b>) o{" "}
        {WA(whatsapp)}.
      </>,
    ),
  ];
}

export function orderUnavailable(code: string): GaluReply[] {
  return [text(<>Ahora no puedo buscarlo. Probá en {trackLink(code, "Seguir mi pedido")} en un ratito.</>)];
}

/** Lo que Gaby le enseñó desde el panel ("Enseñale"): sin modelo, responde antes que las reglas. */
export function taughtReply(answer: string): GaluReply[] {
  return [text(<span style={{ whiteSpace: "pre-line" }}>{answer}</span>)];
}

/** Los cuidados de una prenda (`care` de la ficha; null si no se pudo consultar). */
export type CareLookup = (slug: string) => Promise<string | null>;

/** Plan de cuotas real de Mercado Pago para un monto (null si no responde: no se promete nada). */
export type InstallmentsLookup = (cents: number) => Promise<InstallmentPlan | null>;

/** Cuotas para una prenda con el plan real: "sin interés" solo si Mercado Pago lo confirma para todos los bancos. */
function cuotasFor(p: ProductSummary, plan: InstallmentPlan | null): ReactNode {
  if (!plan) return " Con tarjeta de crédito ves las cuotas de tu banco al pagar.";
  if (plan.interestFree > 1)
    return (
      <>
        {" "}
        Lo podés pagar en <b>{plan.interestFree} cuotas sin interés</b> de{" "}
        <b>{formatARS(installment(p.priceCents, plan.interestFree))}</b>.
      </>
    );
  if (plan.max > 1)
    return (
      <>
        {" "}
        Con tarjeta de crédito, hasta <b>{plan.max} cuotas</b> con Mercado Pago (el interés depende de tu banco).
      </>
    );
  return " Con tarjeta de crédito va en un pago.";
}

/** Lo mismo sin repetir, en el orden en que aparece. */
const unique = <T,>(l: T[]) => [...new Set(l)];

/** "lino, algodón y gabardina". */
/** Tipos de prenda: nombran una categoría, no un modelo. */
const GARMENT_TYPE =
  /^(vestidos?|sets?|conjuntos?|monos?|blusas?|polleras?|faldas?|enteritos?|remeras?|camisas?|camperas?|sacos?|shorts?|jumpers?|bodys?|vinchas?|tapados?|sweaters?|buzos?|pantalon(es)?|calzas?)$/;

const joinAnd = (l: string[]) => (l.length > 1 ? `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}` : (l[0] ?? ""));

/** Edad → talle (talle 4 ≈ 4 años; los impares suben al par siguiente). */
const ageToSize = (age: number): Size =>
  age <= 1 ? "12m" : (String(Math.max(2, Math.min(10, age + (age % 2)))) as Size);

export async function answer(
  raw: string,
  products: ProductSummary[],
  ctx: ProductSummary | null,
  policies: StorePolicies = DEFAULT_POLICIES,
  installments: InstallmentsLookup = async () => null,
  care: CareLookup = async () => null,
): Promise<GaluReply[]> {
  const q = stripAccents(raw);
  const live = products.filter((p) => p.status === "published");
  const colors = unique(live.map((p) => stripAccents(p.color.name)));
  // la última palabra nombra la prenda ("el Samanta"), salvo un color ("rojo") o una que comparten ("bordado")
  const lastWord = (p: ProductSummary) => stripAccents(p.name).split(" ").slice(-1)[0] ?? "";
  const lasts = live.map(lastWord);
  // y la primera del slug ("samanta"), si es suya: no un tipo de prenda ("vestido-rosa" se llevaba "¿qué vestidos tenés?")
  const firstWord = (p: ProductSummary) => p.slug.split("-")[0] ?? "";
  const firsts = live.map(firstWord);
  const names = (w: string, all: string[]) =>
    w.length > 2 && !colors.includes(w) && !GARMENT_TYPE.test(w) && all.indexOf(w) === all.lastIndexOf(w);
  const named = live.find((p) => {
    const last = lastWord(p);
    const first = firstWord(p);
    return (
      q.includes(stripAccents(p.name)) ||
      (names(last, lasts) && q.includes(last)) ||
      (names(first, firsts) && new RegExp(`\\b${first}\\b`).test(q))
    );
  });
  const m = q.match(/talle\s*(12\s?m\b|\d{1,2})|(\d{1,2})\s*anos?/);
  const size: Size | null = m ? (m[1] ? (m[1].replace(/\s/g, "") as Size) : ageToSize(Number(m[2]))) : null;
  const validSize = size && (GARMENT_SIZES as readonly string[]).includes(size) ? size : null;
  const target = named ?? (/(este|esta|el vestido|lo tenes|viene|cuanto sale|hay talle)/.test(q) ? ctx : null);

  const inSize = (p: ProductSummary) => totalStock(p) > 0 && (!validSize || stockOf(p, validSize) > 0);
  const forSize = validSize ? ` en talle ${sizeLabel(validSize)}` : "";

  if (/cambi(o|ar|an)|devol|no le (queda|va)|le (queda|quedo|vino) (chico|grande)|otro talle/.test(q)) {
    const days = policies.exchangeDays === 1 ? "1 día" : `${policies.exchangeDays} días`;
    return [
      text(
        <>
          Si el talle no fue el justo, lo cambiamos: tenés <b>{days}</b> desde que recibís el pedido, con la prenda sin
          uso y con su etiqueta. {WA(policies.contact.whatsapp, "Escribile a Gaby")} con tu número de pedido y el talle
          que querés.{" "}
          <Link className="link" href="/ayuda/cambios">
            Cambios y devoluciones
          </Link>
        </>,
      ),
    ];
  }
  const news = /nuev[oa]s?|novedad|lo ultimo|recien llegad/.test(q) && !/pedido|compra/.test(q);
  if (
    !news &&
    /pedido|seguimiento|llega|andreani|donde esta|mi compra/.test(q) &&
    !/cuanto|costo|sale el envio/.test(q)
  ) {
    return [
      text(
        <>
          Pasame el número de tu pedido (empieza con <b>MG-</b>) y lo busco. También podés verlo en{" "}
          <Link className="link" href="/seguimiento">
            Seguir mi pedido
          </Link>
          .
        </>,
      ),
    ];
  }
  if (/envio|enviar|mandan|codigo postal/.test(q)) {
    const free = freeShippingFrom(policies);
    return [
      text(
        <>
          {deliverySummary(policies)}{" "}
          {free !== null && (
            <>
              Con Andreani, desde <b>{formatARS(free)}</b> el envío es gratis.{" "}
            </>
          )}
          En cada prenda podés calcular el envío con tu código postal
          {policies.methods.acordar || policies.methods.cadete ? (
            <>; si preferís otra forma, {WA(policies.contact.whatsapp, "lo acordamos por WhatsApp")}</>
          ) : null}
          .
        </>,
      ),
    ];
  }
  if (/retir|pasar a buscar|ir a buscar|donde (queda|estan)|ubicad|direccion|horario|local\b|showroom/.test(q)) {
    return [
      text(
        policies.methods.taller ? (
          <>
            Podés <b>retirar gratis en el taller</b>, en {policies.workshop.city}: al finalizar la compra elegís el día
            y el horario ({pickupHoursLabel(policies)}).
          </>
        ) : (
          <>
            Por ahora no tenemos retiro en el taller. {deliverySummary(policies)} Si necesitás otra cosa,{" "}
            {WA(policies.contact.whatsapp, "escribile a Gaby")}.
          </>
        ),
      ),
    ];
  }
  const cuotas = /cuotas/.test(q) ? (target ?? ctx) : null;
  if (cuotas) {
    return [
      text(
        <>
          El <b>{cuotas.name}</b> está <b>{formatARS(cuotas.priceCents)}</b>.
          {cuotasFor(cuotas, await installments(cuotas.priceCents))}
        </>,
      ),
      ...cards([cuotas]),
    ];
  }
  if (/cuotas|como pago|pagar|tarjeta|mercado pago|debito|credito/.test(q) && !(target && /cuanto|sale/.test(q))) {
    return [
      text(
        <>
          Pagás con <b>Mercado Pago</b> sin salir de la web: <b>tarjeta de crédito</b> (en cuotas: al cargar la tarjeta
          ves los planes de tu banco), <b>débito</b> o <b>dinero en cuenta</b>.
        </>,
      ),
    ];
  }
  if (
    /tela|lava|cuidad|planch|secar|material|tejid|algodon|lino|gabardina|\bpana\b|plumeti|puntilla|encog|destin/.test(q)
  ) {
    const about = target ?? ctx;
    if (about) {
      const how = await care(about.slug);
      return [
        text(
          <>
            El <b>{about.name}</b> es de <b>{about.fabric.toLowerCase()}</b>.{" "}
            {how ? `Cuidados: ${how}` : "Los cuidados están en la ficha de la prenda."}
          </>,
        ),
        ...cards([about]),
      ];
    }
    const fabrics = unique(live.map((p) => p.fabric.toLowerCase()));
    const asked = unique(fabrics.flatMap((f) => stripAccents(f).split(" "))).find((w) => w.length > 3 && q.includes(w));
    if (asked) {
      const list = live.filter((p) => stripAccents(p.fabric).includes(asked) && inSize(p));
      return [
        text(
          list.length ? (
            <>
              En <b>{asked}</b>
              {forSize} tengo estos:
            </>
          ) : (
            <>
              En {asked}
              {forSize} no me queda nada ahora. ¿Te muestro otra tela?
            </>
          ),
        ),
        ...cards(list.slice(0, 4), validSize ?? undefined),
      ];
    }
    return [
      text(
        <>
          Trabajamos con <b>{joinAnd(fabrics)}</b>. Cada ficha dice la tela y cómo cuidarla: decime qué prenda te gusta
          y te cuento.
        </>,
      ),
    ];
  }
  if (target && /precio|cuanto|sale|cuesta|vale/.test(q)) {
    const off = discountPercent(target.priceCents, target.compareAtCents);
    return [
      text(
        <>
          El <b>{target.name}</b> está <b>{formatARS(target.priceCents)}</b>
          {off && target.compareAtCents ? ` (antes ${formatARS(target.compareAtCents)})` : ""}.
          {cuotasFor(target, await installments(target.priceCents))}
        </>,
      ),
      ...cards([target]),
    ];
  }
  if (target) {
    if (validSize) {
      const n = stockOf(target, validSize);
      if (n)
        return [
          text(
            <>
              ¡Sí! Del <b>{target.name}</b> hay <b>{n}</b> en talle {validSize}
              {n === 1 ? ". Es la última." : "."}
            </>,
          ),
          ...cards([target], validSize),
        ];
      const alt = live.filter(
        (p) => p !== target && stockOf(p, validSize) > 0 && p.occasions.some((o) => target.occasions.includes(o)),
      );
      return [
        text(
          <>
            Del <b>{target.name}</b> no queda talle {validSize}.{" "}
            {sizesIn(target).length ? (
              <>
                Sí tengo: <b>{sizesIn(target).join(", ")}</b>.{" "}
              </>
            ) : null}
            En la ficha del modelo tocá el talle y te anotás para que te avisemos cuando vuelva.
          </>,
        ),
        ...cards(alt.slice(0, 3), validSize),
      ];
    }
    return [
      text(
        <>
          El <b>{target.name}</b> ({target.fabric.toLowerCase()}){" "}
          {sizesIn(target).length ? (
            <>
              está en talles <b>{sizesIn(target).join(", ")}</b>.
            </>
          ) : (
            "no tiene stock ahora."
          )}
        </>,
      ),
      ...cards([target]),
    ];
  }
  if (/regalo|regalar|sobrina|ahijada|nieta/.test(q)) {
    const list = live
      .filter((p) => !p.isAccessory && totalStock(p) && (!validSize || stockOf(p, validSize) > 0))
      .sort((a, b) => a.priceCents - b.priceCents)
      .slice(0, 3);
    return [
      text(
        <>
          ¡Qué lindo regalo!{" "}
          {validSize ? (
            <>
              Para talle <b>{validSize}</b>{" "}
            </>
          ) : null}
          te recomiendo estos. Si no sabés el talle, una <b>gift card</b> nunca falla.
        </>,
      ),
      ...cards(list, validSize ?? undefined),
      text(
        <Link className="link" href="/giftcards">
          Ver gift cards
        </Link>,
      ),
    ];
  }
  if (/cumple|fiesta|casamiento|bautismo|comunion|navidad|evento/.test(q)) {
    const occ =
      (["casamiento", "bautismo", "comunion", "navidad", "cumple"] as const).find((o) => q.includes(o)) ?? "fiesta";
    const list = live.filter(
      (p) => p.occasions.includes(occ) && totalStock(p) && (!validSize || stockOf(p, validSize) > 0),
    );
    const label =
      occ === "fiesta" ? "una fiesta" : occ === "cumple" ? "un cumple" : occ === "navidad" ? "Navidad" : `un ${occ}`;
    return [
      text(
        list.length ? (
          <>
            Para {label} estos son mis favoritos{validSize ? ` con stock en talle ${validSize}` : ""}:
          </>
        ) : (
          <>
            Para {label} no me queda nada{validSize ? ` en talle ${validSize}` : ""} ahora. ¿Te muestro otra cosa?
          </>
        ),
      ),
      ...cards(list.slice(0, 4), validSize ?? undefined),
    ];
  }
  if (news) {
    const list = live.filter(inSize).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return [
      text(list.length ? `Lo más nuevo del taller${forSize}:` : `Todavía no llegó nada nuevo${forSize}.`),
      ...cards(list.slice(0, 4), validSize ?? undefined),
    ];
  }
  const collections = unique(live.map((p) => p.collection.slug)).flatMap((slug) => {
    const c = live.find((p) => p.collection.slug === slug)?.collection;
    return c ? [c] : [];
  });
  // "Otoño · Invierno 26" se nombra "otoño invierno": alcanzan sus palabras (sin el año)
  const collection = collections.find((c) => {
    const words = stripAccents(c.name).match(/[a-z]{4,}/g) ?? [];
    return words.length > 0 && words.every((w) => q.includes(w));
  });
  if (collection || /coleccion|temporada/.test(q)) {
    if (!collection)
      return [
        text(
          <>
            Ahora están{" "}
            {collections.map((c, i) => (
              <span key={c.slug}>
                {i ? (i === collections.length - 1 ? " y " : ", ") : null}
                <Link className="link" href={`/catalogo?col=${c.slug}`}>
                  {c.name}
                </Link>
              </span>
            ))}
            . ¿Cuál te muestro?
          </>,
        ),
      ];
    const list = live.filter((p) => p.collection.slug === collection.slug && inSize(p));
    return [
      text(
        <>
          {list.length ? (
            <>
              De <b>{collection.name}</b>
              {forSize} tengo estos.{" "}
            </>
          ) : (
            <>
              De <b>{collection.name}</b> no me queda nada{forSize} ahora.{" "}
            </>
          )}
          <Link className="link" href={`/catalogo?col=${collection.slug}`}>
            Ver la colección
          </Link>
        </>,
      ),
      ...cards(list.slice(0, 4), validSize ?? undefined),
    ];
  }
  // "verde" también trae el salvia
  const color = colors.find((c) => q.includes(c)) ?? (/verde/.test(q) ? "verde" : null);
  if (color || /colores|que color/.test(q)) {
    if (!color)
      return [
        text(
          <>
            Ahora hay en <b>{joinAnd(colors)}</b>. ¿Cuál te gusta?
          </>,
        ),
      ];
    const list = live.filter(
      (p) => (stripAccents(p.color.name) === color || (color === "verde" && p.color.name === "Salvia")) && inSize(p),
    );
    return [
      text(
        list.length ? (
          <>
            En <b>{color}</b>
            {forSize} tengo estos:
          </>
        ) : (
          `En ${color} no me queda nada${forSize} ahora. ¿Te muestro otro color?`
        ),
      ),
      ...cards(list.slice(0, 4), validSize ?? undefined),
    ];
  }
  if (validSize) {
    const list = live.filter((p) => stockOf(p, validSize) > 0);
    return [
      text(
        list.length ? (
          <>
            En <b>talle {validSize}</b> tengo <b>{list.length} modelos</b> disponibles ahora:
          </>
        ) : (
          <>En talle {validSize} no queda nada por ahora. ¿Te aviso cuando llegue la próxima tanda?</>
        ),
      ),
      ...cards(list, validSize),
    ];
  }
  if (/a medida|personaliz|encargo|bordar (un|el) nombre/.test(q)) {
    return [
      text(
        <>
          Por ahora no hacemos prendas a medida ni por encargo. Si me contás para qué ocasión es, te muestro lo que hay
          en su talle, o {WA(policies.contact.whatsapp, "le escribís a Gaby")} y lo charlan.
        </>,
      ),
    ];
  }
  if (/talle|medida|tabla|altura/.test(q)) {
    return [
      text(
        <>
          Los talles van por edad (talle 4 ≈ 4 años), pero cada modelo tiene su <b>tabla de medidas</b>. Decime la{" "}
          <b>edad</b> o la <b>altura</b> de la nena y te digo cuál le va.
        </>,
      ),
    ];
  }
  if (/barato|economico|menos de|presupuesto|oferta|descuento/.test(q)) {
    const sale = live.find((p) => discountPercent(p.priceCents, p.compareAtCents));
    return [
      text(
        <>
          Estas son las opciones más accesibles.
          {sale ? (
            <>
              {" "}
              El <b>{sale.name}</b> está con descuento:
            </>
          ) : null}
        </>,
      ),
      ...cards(
        [...live]
          .filter((p) => totalStock(p))
          .sort((a, b) => a.priceCents - b.priceCents)
          .slice(0, 4),
      ),
    ];
  }
  if (/gift|giftcard|tarjeta de regalo/.test(q)) {
    return [
      text(
        <>
          Tenemos gift cards de $10.000 a $50.000. Llegan por mail o WhatsApp con tu mensaje.{" "}
          <Link className="link" href="/giftcards">
            Comprar una
          </Link>
        </>,
      ),
    ];
  }
  if (/hola|buenas|hey|buen dia/.test(q))
    return [text("¡Hola! ¿Para quién estás buscando? Contame la edad y la ocasión y te armo opciones.")];
  return [
    {
      kind: "text",
      unanswered: true,
      content: (
        <>
          Eso todavía no lo sé. Puedo ayudarte con <b>talles, stock, precios, telas, envíos y cambios</b> o a{" "}
          <b>elegir un look</b>. Para otras consultas, {WA(policies.contact.whatsapp)}.
        </>
      ),
    },
  ];
}
