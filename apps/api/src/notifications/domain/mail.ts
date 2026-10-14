import { formatARS, type PaymentMethod, type ShippingMethod } from "@mini-galu/contracts";

/** Un mail listo para mandar (HTML + texto plano para clientes que no muestran HTML). */
export type Mail = { to: string; subject: string; html: string; text: string };

/** Lo que el mail necesita saber del pedido (lo arma la composición desde el módulo de pedidos). */
export type MailOrder = {
  number: string;
  firstName: string;
  email: string;
  items: { name: string; size: string; qty: number; unitPriceCents: number; imageUrl: string }[];
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponCode: string | null;
  shippingMethod: ShippingMethod;
  /** "Gurruchaga 1234, 3° B · CABA (1414)" */
  shippingAddress: string | null;
  /** "Jue 8 · 10 a 13 h" */
  pickupLabel: string | null;
  /** Envío a sucursal: "Palermo (Av Scalabrini Ortiz) · Raúl Scalabrini Ortiz 615". */
  branchLabel?: string | null;
  paymentMethod: PaymentMethod | null;
  installments: number | null;
};

export type MailLinks = { tracking: string; whatsapp: string; site: string; workshop: string };

/** Paleta del atelier (tokens de design-tokens) en hex: los clientes de mail no entienden variables CSS. */
const C = {
  paper: "#FBF8F3",
  linen: "#F4EDE3",
  cacao: "#3A2A22",
  cacao2: "#6E5A4E",
  canela: "#B0643E",
  salvia: "#5F6E52",
  line: "#E6DCCF",
};

const money = formatARS;

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);

/** Marco común de los mails: logo, tarjeta blanca con el contenido y pie con WhatsApp y cambios. */
function frame(title: string, links: Pick<MailLinks, "site" | "whatsapp">, number: string, card: string): string {
  const e = escapeHtml;
  return `<!doctype html>
<html lang="es-AR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;background:${C.paper};font-family:Helvetica,Arial,sans-serif;color:${C.cacao}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${C.paper}">
    <tr><td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px">
        <tr><td style="text-align:center;padding-bottom:24px">
          <a href="${e(links.site)}" style="font-family:Georgia,serif;font-style:italic;font-size:28px;color:${C.cacao};text-decoration:none">Mini Galú</a>
        </td></tr>
        <tr><td style="background:#fff;border-radius:20px;padding:28px;border:1px solid ${C.line}">${card}</td></tr>
        <tr><td style="text-align:center;padding:22px 8px;font-size:12.5px;line-height:1.6;color:${C.cacao2}">
          ¿Dudas? <a href="${e(links.whatsapp)}" style="color:${C.salvia}">Escribinos por WhatsApp</a> con el número <b>#${e(number)}</b>.<br>
          30 días para cambiar el talle, sin uso y con la etiqueta.<br>
          <span style="font-family:Georgia,serif;font-style:italic;color:${C.canela}">gracias por elegir algo hecho a mano ♡</span>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const METHOD: Record<PaymentMethod, string> = {
  credito: "Tarjeta de crédito",
  debito: "Tarjeta de débito",
  dinero_cuenta: "Dinero en cuenta de Mercado Pago",
  link: "Link de pago de Mercado Pago",
  giftcard: "Gift card",
};

function deliveryLine(o: MailOrder, links: MailLinks): string {
  if (o.shippingMethod === "taller")
    return `Retirás en el taller (${links.workshop})${o.pickupLabel ? ` el ${o.pickupLabel}` : ""}.`;
  if (o.shippingMethod === "sucursal")
    return o.branchLabel
      ? `Sale con Andreani y lo retirás en la sucursal ${o.branchLabel}.`
      : "Sale con Andreani a la sucursal más cercana: te confirmamos cuál antes de despacharlo.";
  return `Sale con Andreani a ${o.shippingAddress ?? "tu domicilio"}.`;
}

/** "Recibimos tu pago": sale una sola vez, cuando Mercado Pago aprueba el pago del pedido. */
export function paymentApprovedMail(
  o: MailOrder,
  links: MailLinks,
  /** Texto de la regla "Pago aprobado" (editable en Automatizaciones). */
  intro = "Gaby ya recibió tu pedido y lo prepara en el taller.",
): Mail {
  const e = escapeHtml;
  const paid = o.paymentMethod
    ? `${METHOD[o.paymentMethod]}${o.installments && o.installments > 1 ? ` en ${o.installments} cuotas` : ""}`
    : "Mercado Pago";
  const delivery = deliveryLine(o, links);
  const rows: [string, string][] = [
    ["Subtotal", money(o.subtotalCents)],
    ...(o.discountCents > 0
      ? [[`Cupón ${o.couponCode ?? ""}`.trim(), `-${money(o.discountCents)}`] as [string, string]]
      : []),
    // retirar en el taller no es un envío: no se dice "envío gratis"
    o.shippingMethod === "taller"
      ? ["Retiro en el taller", "Sin costo"]
      : ["Envío", o.shippingCents > 0 ? money(o.shippingCents) : "Gratis"],
  ];

  const items = o.items
    .map(
      (i) => `
      <tr>
        <td style="padding:10px 0;width:64px;vertical-align:top">
          ${i.imageUrl ? `<img src="${e(i.imageUrl)}" width="56" height="75" alt="" style="display:block;border-radius:8px;object-fit:cover">` : ""}
        </td>
        <td style="padding:10px 12px;vertical-align:top;font-size:14px;color:${C.cacao}">
          <div style="font-family:Georgia,serif;font-size:16px">${e(i.name)}</div>
          <div style="color:${C.cacao2};font-size:13px">Talle ${e(i.size)} · ${i.qty} ${i.qty === 1 ? "unidad" : "unidades"}</div>
        </td>
        <td style="padding:10px 0;vertical-align:top;text-align:right;font-size:14px;color:${C.cacao};white-space:nowrap">
          ${money(i.unitPriceCents * i.qty)}
        </td>
      </tr>`,
    )
    .join("");

  const html = frame(
    `Recibimos tu pago · Pedido #${e(o.number)}`,
    links,
    o.number,
    `
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.canela}">Pago aprobado · Pedido #${e(o.number)}</div>
          <h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;margin:12px 0 8px">¡Gracias, <em style="color:${C.canela}">${e(o.firstName)}</em>!</h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:${C.cacao2}">
            ${e(intro)} ${e(delivery)}
          </p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px dashed ${C.line};border-bottom:1px dashed ${C.line}">
            ${items}
          </table>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:14px;font-size:14px">
            ${rows.map(([k, v]) => `<tr><td style="padding:3px 0;color:${C.cacao2}">${e(k)}</td><td style="padding:3px 0;text-align:right">${e(v)}</td></tr>`).join("")}
            <tr><td style="padding:10px 0 0;font-weight:700;font-size:17px">Total</td><td style="padding:10px 0 0;text-align:right;font-weight:700;font-size:17px">${money(o.totalCents)}</td></tr>
            <tr><td colspan="2" style="padding-top:4px;color:${C.cacao2};font-size:12.5px">Pagado con ${e(paid)}</td></tr>
          </table>
          <div style="text-align:center;margin-top:26px">
            <a href="${e(links.tracking)}" style="display:inline-block;background:${C.cacao};color:${C.paper};text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">Seguir mi pedido</a>
          </div>
`,
  );

  const text = [
    `¡Gracias, ${o.firstName}!`,
    `Pago aprobado · Pedido #${o.number}`,
    "",
    `${intro} ${delivery}`,
    "",
    ...o.items.map((i) => `- ${i.name} · talle ${i.size} × ${i.qty}: ${money(i.unitPriceCents * i.qty)}`),
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    `Total: ${money(o.totalCents)} (pagado con ${paid})`,
    "",
    `Seguí tu pedido: ${links.tracking}`,
    `¿Dudas? WhatsApp: ${links.whatsapp}`,
  ].join("\n");

  return { to: o.email, subject: `Recibimos tu pago · Pedido #${o.number}`, html, text };
}

/** Lo que necesita el recordatorio de un link de pago. */
export type ReminderOrder = {
  number: string;
  firstName: string;
  email: string;
  totalCents: number;
  payUrl: string;
  /** "jueves 16 de octubre, 22 h": hasta cuándo se guardan las prendas (null si no vence). */
  reservedUntilLabel: string | null;
};

/** Recordatorio a las 24 h de un link de pago sin pagar (sale una sola vez). */
export function paymentReminderMail(
  o: ReminderOrder,
  links: Pick<MailLinks, "site" | "whatsapp">,
  /** Texto de la regla "Link de pago sin pagar" (editable en Automatizaciones). */
  intro?: string,
): Mail {
  const e = escapeHtml;
  const until = o.reservedUntilLabel ? ` Te las guardamos hasta el ${o.reservedUntilLabel}.` : "";
  const lead =
    intro ??
    `Te dejamos de nuevo el link para pagar tu pedido de ${money(o.totalCents)}. Podés pagar con tarjeta de crédito, débito o dinero en cuenta de Mercado Pago.`;
  const html = frame(
    `Tu pedido #${e(o.number)} te espera`,
    links,
    o.number,
    `
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.canela}">Pedido #${e(o.number)} · falta el pago</div>
          <h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;margin:12px 0 8px">Hola, <em style="color:${C.canela}">${e(o.firstName)}</em></h1>
          <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:${C.cacao2}">
            ${e(lead)}${e(until)}
          </p>
          <div style="text-align:center;margin-top:10px">
            <a href="${e(o.payUrl)}" style="display:inline-block;background:${C.cacao};color:${C.paper};text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">Pagar mi pedido</a>
          </div>`,
  );
  const text = [
    `Hola, ${o.firstName}`,
    `${lead}${until}`,
    "",
    `Pagar: ${o.payUrl}`,
    `¿Dudas? WhatsApp: ${links.whatsapp}`,
  ].join("\n");
  return { to: o.email, subject: `Tu pedido #${o.number} te espera`, html, text };
}

/** "jueves 16 de octubre, 22 h" en hora de Argentina. */
export function untilLabel(d: Date): string {
  const tz = "America/Argentina/Buenos_Aires";
  const day = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: tz })
    .format(d)
    .replace(",", "");
  const hour = new Intl.DateTimeFormat("es-AR", { hour: "numeric", hour12: false, timeZone: tz }).format(d);
  return `${day}, ${Number(hour)} h`;
}

/** Aviso simple de una automatización (despachado, listo para retirar, reseña, volvió un talle…). */
export type MessageMail = {
  to: string;
  subject: string;
  /** "Pedido #MG-1042 · en camino" */
  eyebrow: string;
  /** Para el saludo ("Hola, Lucía"); null: sin nombre. */
  name: string | null;
  /** El mensaje de la regla, ya completado. */
  body: string;
  cta: { label: string; url: string } | null;
  /** Número de pedido para el pie (o null). */
  number: string | null;
};

export function messageMail(m: MessageMail, links: Pick<MailLinks, "site" | "whatsapp">): Mail {
  const e = escapeHtml;
  const html = frame(
    e(m.subject),
    links,
    m.number ?? "",
    `
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.canela}">${e(m.eyebrow)}</div>
          ${m.name ? `<h1 style="font-family:Georgia,serif;font-weight:400;font-size:30px;margin:12px 0 8px">Hola, <em style="color:${C.canela}">${e(m.name)}</em></h1>` : ""}
          <p style="margin:12px 0 20px;font-size:15px;line-height:1.55;color:${C.cacao2};white-space:pre-line">${e(m.body)}</p>
          ${
            m.cta
              ? `<div style="text-align:center;margin-top:10px"><a href="${e(m.cta.url)}" style="display:inline-block;background:${C.cacao};color:${C.paper};text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">${e(m.cta.label)}</a></div>`
              : ""
          }`,
  );
  const text = [
    ...(m.name ? [`Hola, ${m.name}`] : []),
    m.body,
    "",
    ...(m.cta ? [`${m.cta.label}: ${m.cta.url}`] : []),
    `¿Dudas? WhatsApp: ${links.whatsapp}`,
  ].join("\n");
  return { to: m.to, subject: m.subject, html, text };
}

/** Una carta del taller (newsletter): el texto de Gaby y, al pie, el link para darse de baja. */
export function letterMail(
  m: { to: string; subject: string; body: string; unsubscribeUrl: string },
  links: Pick<MailLinks, "site" | "whatsapp">,
): Mail {
  const e = escapeHtml;
  const html = frame(
    e(m.subject),
    links,
    "",
    `
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:${C.canela}">Cartas del taller</div>
          <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:12px 0 8px">${e(m.subject)}</h1>
          <p style="margin:12px 0 20px;font-size:15px;line-height:1.6;color:${C.cacao2};white-space:pre-line">${e(m.body)}</p>
          <div style="text-align:center;margin-top:10px">
            <a href="${e(links.site)}" style="display:inline-block;background:${C.cacao};color:${C.paper};text-decoration:none;font-weight:600;font-size:14px;padding:13px 26px;border-radius:999px">Ver la tienda</a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:${C.cacao2};text-align:center">
            Te llega porque te sumaste a las Cartas del taller.
            <a href="${e(m.unsubscribeUrl)}" style="color:${C.cacao2}">Darme de baja</a>
          </p>`,
  );
  const text = [m.subject, "", m.body, "", `Ver la tienda: ${links.site}`, `Darme de baja: ${m.unsubscribeUrl}`].join(
    "\n",
  );
  return { to: m.to, subject: m.subject, html, text };
}
