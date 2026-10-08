import { discountPercent, formatARS, GARMENT_SIZES, type ProductSummary, type Size } from "@mini-galu/contracts";
import Link from "next/link";
import type { ReactNode } from "react";
import { sizesIn, stockOf, stripAccents, totalStock } from "@/lib/product";
import { SITE } from "@/lib/site";

/**
 * Galú de la fase 2: reglas sobre el catálogo REAL (stock y precios de la API), portado del mockup.
 * Fase 7: se reemplaza por api/assistant (LLM + tools search_products, check_stock, track_order…)
 * manteniendo esta misma forma de respuesta (textos + tarjetas).
 */
export type GaluReply =
  | { kind: "text"; content: ReactNode }
  | { kind: "cards"; products: ProductSummary[]; size?: Size };

const text = (content: ReactNode): GaluReply => ({ kind: "text", content });
const cards = (products: ProductSummary[], size?: Size): GaluReply[] =>
  products.length ? [{ kind: "cards", products, size }] : [];

const WA = (label = "escribile a Gaby") => (
  <a className="link" href={SITE.whatsapp}>
    {label}
  </a>
);

export const DEFAULT_SUGGESTIONS = [
  "¿Qué hay en talle 6?",
  "Algo para un cumple",
  "¿Cuánto sale el Samanta?",
  "Regalo para una nena de 3",
  "¿Dónde está mi pedido?",
];

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

/** Edad → talle (talle 4 ≈ 4 años; los impares suben al par siguiente). */
const ageToSize = (age: number): Size =>
  age <= 1 ? "12m" : (String(Math.max(2, Math.min(10, age + (age % 2)))) as Size);

export function answer(raw: string, products: ProductSummary[], ctx: ProductSummary | null): GaluReply[] {
  const q = stripAccents(raw);
  const live = products.filter((p) => p.status === "published");
  const named = live.find(
    (p) => q.includes(stripAccents(p.name).split(" ").slice(-1)[0] ?? "") || q.includes(p.slug.split("-")[0] ?? ""),
  );
  const m = q.match(/talle\s*(12\s?m\b|\d{1,2})|(\d{1,2})\s*anos?/);
  const size: Size | null = m ? (m[1] ? (m[1].replace(/\s/g, "") as Size) : ageToSize(Number(m[2]))) : null;
  const validSize = size && (GARMENT_SIZES as readonly string[]).includes(size) ? size : null;
  const target = named ?? (/(este|esta|el vestido|lo tenes|viene|cuanto sale|hay talle)/.test(q) ? ctx : null);

  if (/pedido|seguimiento|llega|andreani|donde esta|mi compra/.test(q) && !/cuanto|costo|sale el envio/.test(q)) {
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
    return [
      text(
        <>
          Enviamos a todo el país con <b>Andreani</b> (a domicilio o a sucursal) o podés retirar gratis por el taller.
          Desde <b>$90.000</b> el envío es gratis. En cada prenda podés calcular el envío con tu código postal.
        </>,
      ),
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
  if (target && /precio|cuanto|sale|cuesta|vale/.test(q)) {
    const off = discountPercent(target.priceCents, target.compareAtCents);
    return [
      text(
        <>
          El <b>{target.name}</b> está <b>{formatARS(target.priceCents)}</b>
          {off && target.compareAtCents ? ` (antes ${formatARS(target.compareAtCents)})` : ""}. Con tarjeta de crédito
          lo podés pagar en cuotas.
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
          en su talle, o {WA("le escribís a Gaby")} y lo charlan.
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
  const color = ["rojo", "blanco", "salvia", "verde", "beige", "crema"].find((c) => q.includes(c));
  if (color) {
    const list = live.filter(
      (p) => stripAccents(p.color.name).includes(color) || (color === "verde" && p.color.name === "Salvia"),
    );
    return [
      text(
        <>
          En <b>{color}</b> tengo estos:
        </>,
      ),
      ...cards(list),
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
  // TODO(fase 7): registrar la pregunta sin respuesta para que Gaby le enseñe (AssistantFact)
  return [
    text(
      <>
        Eso todavía no lo sé. Puedo ayudarte con <b>talles, stock, precios, envíos</b> o a <b>elegir un look</b>. Para
        otras consultas, {WA()}.
      </>,
    ),
  ];
}
