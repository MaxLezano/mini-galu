import { z } from "zod";
import type { Cents } from "./money";
import type { OrderStatus, PaymentMethod, ShippingMethod } from "./orders";

export const ORDER_CHANNELS = { web: "Web", instagram: "Instagram", whatsapp: "WhatsApp", galu: "Galú" } as const;
export type OrderChannel = keyof typeof ORDER_CHANNELS;

/** Estados del tablero, en orden (cancelado y reembolsado no son columnas). */
export const BOARD_STATUSES = ["esperando_pago", "nuevo", "preparando", "listo", "en_camino", "entregado"] as const;

export type AdminOrderItem = {
  slug: string;
  name: string;
  size: string;
  qty: number;
  imageUrl: string;
  unitPriceCents: Cents;
};

/** Tarjeta del tablero / fila de la lista. */
export type AdminOrderSummary = {
  number: string;
  status: OrderStatus;
  channel: OrderChannel;
  createdAt: string;
  statusChangedAt: string;
  customer: { name: string; city: string | null };
  units: number;
  totalCents: Cents;
  shippingMethod: ShippingMethod;
  paymentMethod: PaymentMethod | null;
  installments: number | null;
  items: AdminOrderItem[];
};

export type AdminOrderEvent = { kind: string; title: string; detail: string | null; auto: boolean; at: string };

export type AdminOrderDetail = AdminOrderSummary & {
  email: string;
  /** E.164: +5491155551234 */
  phone: string;
  whatsappOptIn: boolean;
  shippingAddress: {
    street: string;
    number: string;
    unit: string | null;
    city: string;
    province: string;
    postalCode: string;
    notes: string | null;
  } | null;
  /** Retiro en el taller: "Jue 8 · 10 a 13 h". */
  pickupLabel: string | null;
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  couponCode: string | null;
  paidAt: string | null;
  reservedUntil: string | null;
  internalNote: string | null;
  payment: {
    provider: string;
    /** Número de operación (Mercado Pago: ORD… o el id del pago). */
    reference: string;
    status: string;
    /** Lo que pagó el cliente (con el interés de las cuotas, si eligió cuotas con interés). */
    paidByCustomerCents: Cents | null;
  } | null;
  events: AdminOrderEvent[];
};

export const MoveOrderInputSchema = z.object({ to: z.enum(BOARD_STATUSES) });
export const BulkAdvanceInputSchema = z.object({ numbers: z.array(z.string().min(1)).min(1).max(100) });
export const OrderNoteInputSchema = z.object({ note: z.string().trim().max(1000) });
