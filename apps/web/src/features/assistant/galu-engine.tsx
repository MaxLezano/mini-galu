import {
  DEFAULT_POLICIES,
  discountPercent,
  formatARS,
  freeShippingFrom,
  GARMENT_SIZES,
  type InstallmentPlan,
  installment,
  ORDER_STATUSES,
  type ProductSummary,
  type PublicTracking,
  type Size,
  type StorePolicies,
} from "@mini-galu/contracts";
import Link from "next/link";
import type { ReactNode } from "react";
import { headline } from "@/features/tracking/tracking-view";
import { sizesIn, stockOf, stripAccents, totalStock } from "@/lib/product";
import { SITE } from "@/lib/site";

/**
 * Galú por reglas sobre el catálogo REAL (stock y precios de la API), portado del mockup.
 * Desde la fase 7 responde el modelo de la API (api/assistant: LLM + tools); esto queda para cuando la API no
 * tiene modelo configurado (CI, local sin Ollama) o no responde, con la misma forma (textos + tarjetas).
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

export function orderNotFound(code: string): GaluReply[] {
  return [
    text(
      <>
        No encontré el pedido <b>{code}</b>. Revisá el número (está en el mail de la compra y empieza con <b>MG-</b>) o{" "}
        {WA()}.
      </>,
    ),
  ];
}

export function orderUnavailable(code: string): GaluReply[] {
  return [text(<>Ahora no puedo buscarlo. Probá en {trackLink(code, "Seguir mi pedido")} en un ratito.</>)];
}

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

/** Edad → talle (talle 4 ≈ 4 años; los impares suben al par siguiente). */
const ageToSize = (age: number): Size =>
  age <= 1 ? "12m" : (String(Math.max(2, Math.min(10, age + (age % 2)))) as Size);

export async function answer(
  raw: string,
  products: ProductSummary[],
  ctx: ProductSummary | null,
  policies: StorePolicies = DEFAULT_POLICIES,
  installments: InstallmentsLookup = async () => null,
): Promise<GaluReply[]> {
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
    const free = freeShippingFrom(policies);
    return [
      text(
        <>
          Enviamos a todo el país con <b>Andreani</b> (a domicilio o a sucursal)
          {policies.methods.taller ? " o podés retirar gratis por el taller" : ""}.{" "}
          {free !== null && (
            <>
              Desde <b>{formatARS(free)}</b> el envío es gratis.{" "}
            </>
          )}
          En cada prenda podés calcular el envío con tu código postal.
        </>,
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
