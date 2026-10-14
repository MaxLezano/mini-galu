import type { ShippingSettings } from "@mini-galu/contracts";
import type { Branch } from "../domain/branches";
import type { CarrierEvent, TrackedOrder } from "../domain/tracking";

/**
 * Puerto de cotización. Hoy: tabla por código postal (`TableShippingRates`).
 * TODO(fase 10 · shipping): cotización real de Andreani cuando haya credenciales.
 */
export interface ShippingRates {
  /** Precios en centavos y texto de plazo para un CP. */
  quote(postalCode: string): Promise<{
    domicilio: { cents: number; detail: string };
    sucursal: { cents: number; detail: string };
  }>;
}

/** Lo que el correo necesita para dar de alta un envío y armar la etiqueta. */
export type NewShipment = {
  orderNumber: string;
  method: "domicilio" | "sucursal";
  recipient: { name: string; phone: string; email: string };
  /** "Gurruchaga 1234, 3° B" (null en sucursal). */
  street: string | null;
  /** La misma dirección por partes, como la pide el correo (null en sucursal). */
  address: { street: string; number: string; unit: string | null } | null;
  city: string | null;
  province: string;
  postalCode: string;
  notes: string | null;
  /** Envío a sucursal: dónde retira el cliente. */
  branch: { id: string; name: string; address: string } | null;
  units: number;
  /** Paquete, origen y remitente del panel (null si todavía no se cargaron). */
  from: ShippingSettings | null;
};

/** Correo (Andreani). Hoy: FakeAndreani. TODO(fase 10 · shipping): AndreaniAdapter con las credenciales del contrato. */
export interface ShippingGateway {
  readonly carrier: string;
  /** simulado (FakeAndreani) · qa (pruebas de Andreani) · produccion */
  readonly mode: "simulado" | "qa" | "produccion";
  createShipment(s: NewShipment): Promise<{ trackingNumber: string }>;
  /** Todo lo que informó el correo hasta ahora, en orden. */
  events(trackingNumber: string): Promise<CarrierEvent[]>;
  /** Etiqueta PDF 10×15 para imprimir y pegar en el paquete. */
  label(trackingNumber: string, s: NewShipment): Promise<Uint8Array>;
  trackingUrl(trackingNumber: string): string | null;
}

export type Shipment = {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  createdAt: Date;
  deliveredAt: Date | null;
};

export interface ShipmentRepository {
  create(s: { orderId: string; carrier: string; trackingNumber: string }): Promise<Shipment>;
  byOrder(orderId: string): Promise<Shipment | null>;
  byTracking(trackingNumber: string): Promise<Shipment | null>;
  /** Envíos que todavía no se entregaron (para consultar al correo). */
  pending(): Promise<Shipment[]>;
  events(shipmentId: string): Promise<CarrierEvent[]>;
  /** Guarda los eventos nuevos (los repetidos se ignoran) y devuelve solo los nuevos. */
  addEvents(shipmentId: string, events: CarrierEvent[], checkedAt: Date): Promise<CarrierEvent[]>;
  markDelivered(shipmentId: string, at: Date): Promise<void>;
}

/** Un pedido visto desde envíos (lo da el módulo de pedidos). */
export type ShippableOrder = TrackedOrder & {
  id: string;
  number: string;
  accessToken: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  totalCents: number;
  street: string | null;
  address: { street: string; number: string; unit: string | null } | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  notes: string | null;
  branch: { id: string; name: string; address: string } | null;
  items: { slug: string; name: string; size: string; qty: number; imageUrl: string }[];
};

/** Lo que envíos le pide al módulo de pedidos: leerlos y moverlos cuando pasa algo con el paquete. */
export interface ShippableOrders {
  find(number: string): Promise<ShippableOrder | null>;
  findById(id: string): Promise<ShippableOrder | null>;
  /** Etiqueta generada: preparando → listo, con el número en el historial. */
  labeled(orderId: string, trackingNumber: string): Promise<void>;
  /** El correo retiró el paquete: listo → en camino. */
  shipped(orderId: string, at: Date): Promise<void>;
  /** El correo lo entregó: → entregado. */
  delivered(orderId: string, at: Date): Promise<void>;
}

/** Listado de sucursales del correo (Andreani publica el suyo sin credenciales). */
export interface BranchDirectory {
  all(): Promise<Branch[]>;
}

/** Ajustes de envío del panel (paquete, origen y remitente). */
export interface ShippingSettingsStore {
  get(): Promise<ShippingSettings | null>;
  save(s: ShippingSettings): Promise<void>;
}
