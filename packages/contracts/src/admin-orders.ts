import { z } from "zod";
import { CartItemInputSchema, CheckoutContactSchema, ShippingInputSchema } from "./checkout";
import type { Cents } from "./money";
import type { OrderStatus, PaymentMethod, ShippingMethod } from "./orders";
import type { AdminRevocation } from "./revocation";

export const ORDER_CHANNELS = {
  web: "Web",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  galu: "Galú",
  taller: "En el taller",
} as const;
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
  /** Número de Andreani si ya tiene etiqueta. */
  trackingNumber: string | null;
  /** Si el cliente pidió la baja con el botón de arrepentimiento. */
  revocation: AdminRevocation | null;
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
  /** Envío a sucursal: dónde retira. */
  shippingBranch: { id: string; name: string; address: string } | null;
  subtotalCents: Cents;
  discountCents: Cents;
  shippingCents: Cents;
  couponCode: string | null;
  paidAt: string | null;
  reservedUntil: string | null;
  internalNote: string | null;
  /** Link para pagar (pedidos por Instagram/WhatsApp que esperan el pago). */
  payUrl: string | null;
  payment: {
    provider: string;
    /** Número de operación (Mercado Pago: ORD… o el id del pago). */
    reference: string;
    status: string;
    /** Lo que pagó el cliente (con el interés de las cuotas, si eligió cuotas con interés). */
    paidByCustomerCents: Cents | null;
    /** "Te queda": lo que acreditó Mercado Pago después de su comisión (null si no lo informa). */
    netCents: Cents | null;
  } | null;
  events: AdminOrderEvent[];
  /** Lo que se puede devolver de este pedido (null si no hay nada para reintegrar). */
  refund: AdminRefund | null;
};

/** Reintegro total de un pedido pagado (o de un pago que llegó cuando ya no había stock). */
export type AdminRefund = {
  /** Lo que vuelve por Mercado Pago, por el mismo medio con que se pagó (0 si se pagó todo con gift card). */
  cents: Cents;
  /** Se cobró en efectivo en el taller: `cents` se devuelve en mano, no por Mercado Pago. */
  cash: boolean;
  /** Lo que vuelve al saldo de la gift card con que se pagó una parte. */
  giftcardCents: Cents;
  /** Si hay prendas que pueden volver al stock (no en la compra de una gift card ni en un pago sin stock). */
  restock: boolean;
  /** Las prendas todavía no salieron del taller: lo normal es devolverlas al stock. */
  restockSuggested: boolean;
  /** Por qué no se puede reintegrar (la gift card comprada ya se usó, no está el pago…). */
  blocked: string | null;
};

export const RefundInputSchema = z.object({
  restock: z.boolean().default(false),
  reason: z.string().trim().max(300).default(""),
});
export type RefundInput = z.input<typeof RefundInputSchema>;

export type RefundResult = {
  cents: Cents;
  giftcardCents: Cents;
  /** Mercado Pago lo tomó pero todavía lo está procesando. */
  pending: boolean;
};

export const MoveOrderInputSchema = z.object({ to: z.enum(BOARD_STATUSES) });
export const BulkAdvanceInputSchema = z.object({ numbers: z.array(z.string().min(1)).min(1).max(100) });
export const OrderNoteInputSchema = z.object({ note: z.string().trim().max(1000) });

/* ------------------------------------------------------------------ resumen del día (admin.html) */

/** Ventas de un período (semana que arranca el lunes o mes), en hora de Argentina. */
export type SalesPoint = { start: string; cents: Cents };

/** Algo que hizo el sistema solo (pago aprobado, mail enviado…), para "Lo que se hizo solo". */
export type AutoActivity = {
  number: string;
  customer: string;
  kind: string;
  title: string;
  detail: string | null;
  at: string;
};

export type AdminDaySummary = {
  todo: {
    /** nuevo + preparando */
    toPrepare: number;
    /** listos para despachar (envío a domicilio o sucursal) */
    toShip: number;
    /** listos para retirar en el taller */
    toPickup: number;
    /** links de pago (WhatsApp, Instagram) que todavía no se pagaron */
    awaitingPayment: number;
  };
  month: {
    salesCents: Cents;
    prevSalesCents: Cents;
    orders: number;
    /** Pedidos del mes de clientes que ya habían comprado. */
    returning: number;
    avgTicketCents: Cents;
    prevAvgTicketCents: Cents;
    /** Lo que se vendería en el mes al ritmo actual (null el primer día). */
    projectionCents: Cents | null;
  };
  /** Últimas 8 semanas y últimos 12 meses, de la más vieja a la actual. */
  weeks: SalesPoint[];
  months: SalesPoint[];
  recent: AdminOrderSummary[];
  feed: AutoActivity[];
};

/* ------------------------------------------------------------------ links de pago (ventas por Instagram/WhatsApp) */

/** Horas que se guarda el stock de un link de pago; a las 24 h se le recuerda al cliente. */
export const PAYMENT_LINK_HOURS = 72;
export const PAYMENT_LINK_REMINDER_HOURS = 24;

/**
 * Venta cargada en el panel: por Instagram o WhatsApp (sale un link de pago) o en el taller (se la lleva en el
 * momento, sin entrega). Con una gift card se descuenta su saldo; si cubre todo, el pedido queda pagado. En el taller
 * también se puede cobrar en efectivo: la venta queda pagada en el momento, sin link.
 */
export const PaymentLinkInputSchema = z
  .object({
    channel: z.enum(["whatsapp", "instagram", "taller"]),
    payment: z.enum(["link", "efectivo"]).default("link"),
    contact: CheckoutContactSchema,
    shipping: ShippingInputSchema.nullable().default(null),
    items: z
      .array(CartItemInputSchema.extend({ qty: z.number().int().min(1).max(20) }))
      .min(1, "Agregá al menos una prenda")
      .max(30),
    giftcardCode: z.string().trim().max(40).nullable().default(null),
  })
  .refine((v) => v.channel === "taller" || v.shipping, { path: ["shipping"], message: "Elegí la entrega" })
  .refine((v) => v.channel === "taller" || v.payment === "link", {
    path: ["payment"],
    message: "En efectivo solo se cobra en el taller",
  });
export type PaymentLinkInput = z.input<typeof PaymentLinkInputSchema>;

export type PaymentLinkCreated = {
  number: string;
  /** Página de la tienda donde el cliente paga (sin cuenta): /pagar/MG-1046?t=… */
  payUrl: string;
  /** Lo que queda por pagar (0 si la gift card cubrió todo); en efectivo, lo que se cobró. */
  totalCents: Cents;
  giftcardCents: Cents;
  /** La gift card cubrió todo o se cobró en efectivo: el pedido ya está pagado y no hace falta el link. */
  paid: boolean;
  /** Se cobró en efectivo (`totalCents`) en el taller. */
  cash: boolean;
  reservedUntil: string;
};
