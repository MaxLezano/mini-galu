import type { Cents } from "./money";
import type { OrderStatus, ShippingMethod } from "./orders";

/** Un punto del recorrido (seguimiento.html → .journey). */
export type TrackingStop = { title: string; detail: string; done: boolean };

/** Una línea del recorrido detallado, la más nueva primero (seguimiento.html → .log). */
export type TrackingLogEntry = { title: string; detail: string; at: string };

/** Seguimiento público de un pedido (sin cuenta): por número de pedido o número de Andreani. */
export type PublicTracking = {
  number: string;
  status: OrderStatus;
  shippingMethod: ShippingMethod;
  createdAt: string;
  paidAt: string | null;
  totalCents: Cents;
  items: { slug: string; name: string; size: string; qty: number; imageUrl: string }[];
  /** "El taller · Villa Crespo, CABA" · "Sucursal Andreani · Rosario" · "Palermo, CABA" (sin la calle). */
  destination: string;
  /** Nombre e inicial del apellido ("Lucía F."): la página es pública. */
  recipient: string;
  shipment: { carrier: string; trackingNumber: string; url: string | null } | null;
  stops: TrackingStop[];
  log: TrackingLogEntry[];
  /** Solo si se entró con el link que tiene el token del pedido (para pagar lo que falta). */
  payUrl: string | null;
};

/** Lo que devuelve generar la etiqueta desde el panel. */
export type ShipmentCreated = { carrier: string; trackingNumber: string };
