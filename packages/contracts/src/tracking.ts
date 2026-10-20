import { z } from "zod";
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
  /** Solo con el token del pedido (los números son correlativos: sin el link no se ve cuánto se pagó). */
  totalCents: Cents | null;
  items: { slug: string; name: string; size: string; qty: number; imageUrl: string }[];
  /** "El taller · San Miguel de Tucumán, Tucumán" · "Sucursal Andreani · Rosario" · "Palermo, CABA" (sin la calle). */
  destination: string;
  /** Nombre e inicial del apellido ("Lucía F."): la página es pública. */
  recipient: string;
  shipment: { carrier: string; trackingNumber: string; url: string | null } | null;
  stops: TrackingStop[];
  log: TrackingLogEntry[];
  /** Solo si se entró con el link que tiene el token del pedido (para pagar lo que falta). */
  payUrl: string | null;
};

/** "/seguimiento?pedido=MG-1043&t=…": con el token, el seguimiento también muestra el total y el link para pagar. */
export const trackingPath = (number: string, token?: string | null) =>
  `/seguimiento?pedido=${encodeURIComponent(number)}${token ? `&t=${encodeURIComponent(token)}` : ""}`;

/** Lo que devuelve generar la etiqueta desde el panel. */
export type ShipmentCreated = { carrier: string; trackingNumber: string };

/** "Etiquetas" de la selección del tablero: los pedidos que entran en el PDF y los que no (con el porqué). */
export type BulkLabels = { labeled: string[]; skipped: { number: string; reason: string }[] };

/* ------------------------------------------------------------------ ajustes de envío (panel) */

/** Paquetes con los que se despacha (admin-tienda.html → "Paquete por defecto"). Peso en kg, medidas en cm. */
export const PACKAGE_PRESETS = {
  bolsa: { label: "Bolsa 30×40 · 500 g", kilos: 0.5, largoCm: 40, anchoCm: 30, altoCm: 5 },
  caja_chica: { label: "Caja chica 25×20×8 · 1 kg", kilos: 1, largoCm: 25, anchoCm: 20, altoCm: 8 },
} as const;
export type PackagePreset = keyof typeof PACKAGE_PRESETS;

const text = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);

export const ShippingSettingsSchema = z.object({
  package: z.enum(Object.keys(PACKAGE_PRESETS) as [PackagePreset, ...PackagePreset[]]),
  /** Desde dónde sale el paquete (la dirección del taller). */
  origin: z.object({
    street: text(40, "Poné la calle"),
    number: text(10, "Poné la altura"),
    unit: z.string().trim().max(20).nullable(),
    city: text(40, "Poné la localidad"),
    province: text(40, "Poné la provincia"),
    postalCode: z
      .string()
      .trim()
      .regex(/^\d{4}$/, "El código postal son 4 números"),
  }),
  /** Quién figura como remitente en la etiqueta. */
  sender: z.object({
    name: text(40, "Poné el nombre o la razón social"),
    phone: text(15, "Poné un teléfono"),
    email: z.email("Revisá el email"),
    /** CUIT o DNI (opcional para Andreani). */
    taxId: z.string().trim().max(20).nullable(),
  }),
});
export type ShippingSettings = z.infer<typeof ShippingSettingsSchema>;

/** Lo que muestra "Tienda y pagos → Envíos": los ajustes y cómo está conectado Andreani. */
export type AdminShipping = {
  /** null: todavía no se cargaron (faltan origen y remitente). */
  settings: ShippingSettings | null;
  andreani: {
    /** simulado: sin credenciales (FakeAndreani) · qa: ambiente de pruebas de Andreani · produccion */
    mode: "simulado" | "qa" | "produccion";
    /** Sucursales de la API pública de Andreani (o fijas, en tests). */
    branches: "andreani" | "fake";
  };
};
