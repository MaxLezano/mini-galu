import type { AdminOrderItem, AdminOrderSummary, OrderStatus } from "@mini-galu/contracts";

/** Qué hace el botón principal de un pedido (mismo criterio que nextAction() del mockup admin.js). */
export type NextAction =
  | { kind: "move"; label: string; icon: "scissors" | "package-check" | "truck" | "circle-check"; to: OrderStatus }
  | { kind: "whatsapp"; label: string; icon: "star" | "send"; template: TemplateKey }
  | { kind: "label"; label: string; icon: "printer" }
  | { kind: "href"; label: string; icon: "external-link"; href: string }
  | null;

export function nextAction(
  o: Pick<AdminOrderSummary, "status" | "shippingMethod"> &
    Partial<Pick<AdminOrderSummary, "number" | "trackingNumber">>,
): NextAction {
  const pickup = o.shippingMethod === "taller";
  switch (o.status) {
    case "nuevo":
      return { kind: "move", label: "Empezar a preparar", icon: "scissors", to: "preparando" };
    case "preparando":
      // la etiqueta guarda el número de Andreani y deja el pedido listo para despachar
      return pickup
        ? { kind: "move", label: "Marcar listo para retirar", icon: "package-check", to: "listo" }
        : { kind: "label", label: "Generar etiqueta Andreani", icon: "printer" };
    case "listo":
      return pickup
        ? { kind: "move", label: "Marcar como retirado", icon: "circle-check", to: "entregado" }
        : { kind: "move", label: "Marcar despachado", icon: "truck", to: "en_camino" };
    case "en_camino":
      // con etiqueta, Andreani lo marca entregado solo; despachado a mano, se cierra a mano
      return o.trackingNumber && o.number
        ? { kind: "href", label: "Ver seguimiento", icon: "external-link", href: `/seguimiento?pedido=${o.number}` }
        : { kind: "move", label: "Marcar entregado", icon: "circle-check", to: "entregado" };
    case "entregado":
      return { kind: "whatsapp", label: "Pedir reseña", icon: "star", template: "resena" };
    case "esperando_pago":
      return { kind: "whatsapp", label: "Reenviar link de pago", icon: "send", template: "link" };
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ WhatsApp */

export type TemplateKey = "link" | "pago" | "despacho" | "retiro" | "resena" | "libre";

export const TEMPLATES: Record<TemplateKey, { title: string; body: string }> = {
  link: {
    title: "Link de pago",
    body: "Hola {nombre}! Te dejo el link para pagar tu pedido #{pedido}: {link} Podés pagar con tarjeta de crédito, débito o dinero en cuenta. Te lo guardamos hasta el {vence} ✿",
  },
  pago: {
    title: "Pago recibido",
    body: "Hola {nombre}! Recibimos el pago de tu pedido #{pedido}. Ya lo estamos preparando en el taller. Te avisamos cuando salga ✿",
  },
  despacho: {
    title: "Pedido despachado",
    body: "{nombre}, tu pedido #{pedido} ya salió con Andreani. Lo podés seguir acá: {seguimiento}",
  },
  retiro: {
    title: "Listo para retirar",
    body: "Hola {nombre}! Tu pedido #{pedido} está listo para retirar en el taller ({taller}). {horario}",
  },
  resena: {
    title: "Pedir reseña",
    body: "Hola {nombre}! ¿Cómo le quedó? Si nos mandás una foto nos alegra el día ♡",
  },
  libre: { title: "Mensaje libre", body: "Hola {nombre}! " },
};

/** La plantilla que corresponde según el estado (como openWA() del mockup). */
export function defaultTemplate(o: Pick<AdminOrderSummary, "status" | "shippingMethod">): TemplateKey {
  if (o.status === "esperando_pago") return "link";
  if (o.status === "listo") return o.shippingMethod === "taller" ? "retiro" : "despacho";
  if (o.status === "en_camino") return "despacho";
  if (o.status === "entregado") return "resena";
  return "pago";
}

export function fillTemplate(
  body: string,
  v: {
    nombre: string;
    pedido: string;
    seguimiento: string;
    taller: string;
    horario: string;
    link: string;
    vence: string;
  },
): string {
  return body
    .replaceAll("{link}", v.link)
    .replaceAll("{vence}", v.vence)
    .replaceAll("{nombre}", v.nombre)
    .replaceAll("{pedido}", v.pedido)
    .replaceAll("{seguimiento}", v.seguimiento)
    .replaceAll("{taller}", v.taller)
    .replaceAll("{horario}", v.horario);
}

/** wa.me con el texto prellenado (el teléfono se guarda en E.164: +5491155551234). */
export const waLink = (phoneE164: string, text: string) =>
  `https://wa.me/${phoneE164.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

/* ------------------------------------------------------------------ lista de preparación */

export type PickRow = { slug: string; name: string; size: string; qty: number; imageUrl: string; orders: string[] };

/** Prendas a preparar agrupadas por modelo y talle (openPicking() del mockup). */
export function pickingList(orders: Pick<AdminOrderSummary, "number" | "items">[]): PickRow[] {
  const rows = new Map<string, PickRow>();
  for (const o of orders)
    for (const i of o.items as AdminOrderItem[]) {
      const key = `${i.slug}|${i.size}`;
      const row = rows.get(key) ?? {
        slug: i.slug,
        name: i.name,
        size: i.size,
        qty: 0,
        imageUrl: i.imageUrl,
        orders: [],
      };
      row.qty += i.qty;
      if (!row.orders.includes(o.number)) row.orders.push(o.number);
      rows.set(key, row);
    }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name, "es") || a.size.localeCompare(b.size, "es"));
}

/** Pedidos que hay que preparar (nuevos y en preparación). */
export const toPrepare = <T extends Pick<AdminOrderSummary, "status">>(orders: T[]) =>
  orders.filter((o) => o.status === "nuevo" || o.status === "preparando");
