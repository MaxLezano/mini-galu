import type { OrderStatus, ShippingMethod, TrackingLogEntry, TrackingStop } from "@mini-galu/contracts";

/** Lo que informa el correo. `delivered` cierra el envío; `picked_up` lo pone en camino. */
/** issue: algo para avisar que no cambia el paso (visita sin éxito, no entregado, vuelve al remitente). */
export type CarrierCode = "picked_up" | "hub" | "in_transit" | "out_for_delivery" | "at_branch" | "delivered" | "issue";
export type CarrierEvent = { code: CarrierCode; title: string; location: string | null; at: Date };

/** Lo que el seguimiento necesita del pedido. */
export type TrackedOrder = {
  status: OrderStatus;
  shippingMethod: ShippingMethod;
  channel: string;
  createdAt: Date;
  paidAt: Date | null;
  /** "Tarjeta de crédito · 3 cuotas" */
  paidWith: string | null;
  /** Cambios de estado del historial (a qué estado y cuándo). */
  moves: { to: OrderStatus; at: Date }[];
  workshop: string;
};

const TZ = "America/Argentina/Buenos_Aires";
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("es-AR", { ...o, timeZone: TZ }).format(d).replaceAll(".", "").replace(",", "");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "vie 2 oct" */
export const dayLabel = (d: Date) => fmt(d, { weekday: "short", day: "numeric", month: "short" });
/** "Lun 5 oct · 21:40" */
export const whenLabel = (d: Date) =>
  `${cap(dayLabel(d))} · ${fmt(d, { hour: "2-digit", minute: "2-digit", hour12: false })}`;

const lastMove = (o: TrackedOrder, to: OrderStatus) => o.moves.filter((m) => m.to === to).at(-1)?.at ?? null;
const carrierAt = (ev: CarrierEvent[], ...codes: CarrierCode[]) => ev.find((e) => codes.includes(e.code))?.at ?? null;

/** Los puntos del recorrido (como stopsFor() del mockup): envío en 5 pasos, retiro en el taller en 4. */
export function trackingStops(o: TrackedOrder, ev: CarrierEvent[]): TrackingStop[] {
  const pickup = o.shippingMethod === "taller";
  const reached: Partial<Record<OrderStatus, number>> = pickup
    ? { nuevo: 0, preparando: 1, listo: 2, entregado: 3 }
    : { nuevo: 0, preparando: 1, listo: 1, en_camino: 3, entregado: 4 };
  let at = reached[o.status] ?? -1;
  if (!pickup && o.status === "listo" && carrierAt(ev, "picked_up")) at = 2;
  const prep = lastMove(o, "preparando");
  const stops: [string, string, Date | null][] = pickup
    ? [
        ["Pagado", "Mercado Pago", o.paidAt],
        ["Preparando", "en el taller", prep],
        ["Listo para retirar", o.workshop, lastMove(o, "listo")],
        ["Retirado", "", lastMove(o, "entregado")],
      ]
    : [
        ["Pagado", "Mercado Pago", o.paidAt],
        ["Preparando", "en el taller", prep],
        ["Despachado", "Andreani", carrierAt(ev, "picked_up") ?? lastMove(o, "en_camino")],
        ["En camino", "", carrierAt(ev, "in_transit", "hub")],
        [
          "Entregado",
          o.status === "en_camino" ? "estimado en 2 a 3 días hábiles" : "",
          carrierAt(ev, "delivered") ?? lastMove(o, "entregado"),
        ],
      ];
  return stops.map(([title, detail, date], i) => ({
    title,
    detail: i <= at && date ? dayLabel(date) : detail,
    done: i <= at,
  }));
}

/** El recorrido detallado, lo más nuevo primero. Solo lo que le sirve al cliente (nada interno del taller). */
export function trackingLog(
  o: TrackedOrder,
  shipment: { trackingNumber: string; createdAt: Date } | null,
  ev: CarrierEvent[],
): TrackingLogEntry[] {
  const pickup = o.shippingMethod === "taller";
  const out: { title: string; detail: string; at: Date }[] = [];
  if (o.status === "esperando_pago" || !o.paidAt)
    out.push({
      title: "Pedido creado · esperando el pago",
      detail: o.channel === "web" ? "Mini Galú" : "Te mandamos el link para pagar",
      at: o.createdAt,
    });
  if (o.paidAt) out.push({ title: "Pago aprobado", detail: o.paidWith ?? "Mercado Pago", at: o.paidAt });
  for (const m of o.moves) {
    if (m.to === "preparando") out.push({ title: "En preparación en el taller", detail: "Mini Galú", at: m.at });
    if (m.to === "listo" && pickup)
      out.push({ title: "Listo para retirar en el taller", detail: o.workshop, at: m.at });
    if (m.to === "listo" && !pickup && !shipment)
      out.push({ title: "Listo · sale en el próximo retiro", detail: "Mini Galú", at: m.at });
    if (m.to === "en_camino" && !carrierAt(ev, "picked_up"))
      out.push({ title: "Despachado", detail: "Mini Galú", at: m.at });
    if (m.to === "entregado" && (pickup || !carrierAt(ev, "delivered")))
      out.push({ title: pickup ? "Retirado en el taller" : "Entregado", detail: pickup ? o.workshop : "", at: m.at });
  }
  if (shipment)
    out.push({ title: "Etiqueta generada", detail: `Andreani Nº ${shipment.trackingNumber}`, at: shipment.createdAt });
  for (const e of ev) out.push({ title: e.title, detail: e.location ?? "Andreani", at: e.at });
  return out
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .map((x) => ({
      title: x.title,
      detail: `${whenLabel(x.at)}${x.detail ? ` · ${x.detail}` : ""}`,
      at: x.at.toISOString(),
    }));
}

/** "Lucía F." */
export const recipientLabel = (firstName: string, lastName: string) =>
  `${firstName.trim()}${lastName.trim() ? ` ${lastName.trim().charAt(0).toUpperCase()}.` : ""}`;
