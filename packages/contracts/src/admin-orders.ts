import { z } from "zod";
import { CartItemInputSchema, CheckoutContactSchema, ShippingInputSchema } from "./checkout";
import type { AdminInvoice } from "./invoices";
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
  /** Renglón del pedido (para cambiar el talle). */
  id: string;
  slug: string;
  name: string;
  size: string;
  qty: number;
  /** Unidades que ya se devolvieron (devolución parcial): no se cambian ni se vuelven a devolver. */
  returnedQty: number;
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
  /** Entregado: dónde deja la reseña el cliente (va en el WhatsApp de "Pedir reseña"). */
  reviewUrl: string | null;
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
  /** Devolver algunas prendas (null si no es un pedido de prendas pagado o ya se devolvieron todas). */
  returns: AdminReturn | null;
  /** Factura y nota de crédito (ARCA), en orden. */
  invoices: AdminInvoice[];
  /** Cambio de talle (null si el pedido no está pagado o es una gift card). */
  exchange: AdminExchange | null;
};

/** Cambio de talle desde el detalle: por prenda, los otros talles del mismo modelo con su stock. */
export type AdminExchange = {
  /** Las prendas todavía no salieron del taller: lo normal es que la devuelta vuelva al stock. */
  restockSuggested: boolean;
  items: { itemId: string; sizes: { size: string; stock: number }[] }[];
};

/** Cambiar el talle de una prenda (o de algunas unidades): sale el talle nuevo del stock y vuelve el otro. */
export const ExchangeInputSchema = z.object({
  itemId: z.string().min(1),
  size: z.string().trim().min(1).max(10),
  qty: z.number().int().min(1).max(99).default(1),
  /** La prenda devuelta vuelve al stock (ya está en el taller). */
  restock: z.boolean().default(true),
  reason: z.string().trim().max(300).default(""),
});
export type ExchangeInput = z.input<typeof ExchangeInputSchema>;

/**
 * Reintegro total de un pedido pagado (o de un pago que llegó cuando ya no había stock). Después de una devolución
 * parcial, es lo que queda.
 */
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

/** Lo que se cobró de un pedido y lo que ya se devolvió: con esto se calcula cuánto vale devolver algunas prendas. */
export type ReturnBase = {
  /** Las prendas del pedido a su precio (las ya devueltas incluidas) y el descuento del cupón sobre ellas. */
  itemsCents: Cents;
  discountCents: Cents;
  /** Lo cobrado (Mercado Pago o efectivo) y lo pagado con gift card. */
  totalCents: Cents;
  giftcardCents: Cents;
  /** Lo que ya se devolvió de cada uno. */
  refundedCents: Cents;
  giftcardRefundedCents: Cents;
};

/** Devolución de algunas prendas de un pedido pagado (el envío no se devuelve: queda para el reintegro total). */
export type AdminReturn = ReturnBase & {
  /** Se cobró en efectivo en el taller: la plata se devuelve en mano. */
  cash: boolean;
  /** Las prendas todavía no salieron del taller: lo normal es que vuelvan al stock. */
  restockSuggested: boolean;
  /** Por qué no se puede (no está el pago de Mercado Pago…). */
  blocked: string | null;
};

/**
 * Cuánto se devuelve por prendas que valen `cents` a su precio: menos su parte del cupón y, del resto, la parte que se
 * pagó con gift card vuelve a su saldo y lo demás por Mercado Pago (o en efectivo). Nunca más de lo que queda.
 * `discountCents` es lo que se descuenta (la nota de crédito lo lleva como renglón).
 */
export function returnAmounts(
  b: ReturnBase,
  cents: Cents,
): { saleCents: Cents; discountCents: Cents; cents: Cents; giftcardCents: Cents } {
  const share = b.itemsCents > 0 ? Math.round((b.discountCents * cents) / b.itemsCents) : 0;
  const leftMoney = b.totalCents - b.refundedCents;
  const leftGiftcard = b.giftcardCents - b.giftcardRefundedCents;
  const sale = Math.max(0, Math.min(cents - share, leftMoney + leftGiftcard));
  const paid = b.totalCents + b.giftcardCents;
  const giftcard = paid > 0 ? Math.min(leftGiftcard, Math.round((sale * b.giftcardCents) / paid)) : 0;
  const money = Math.min(leftMoney, sale - giftcard);
  return { saleCents: sale, discountCents: cents - sale, cents: money, giftcardCents: sale - money };
}

/** Devolver algunas unidades de algunas prendas: vuelve su parte de la plata y sale una nota de crédito por ellas. */
export const ReturnInputSchema = z.object({
  items: z
    .array(z.object({ itemId: z.string().min(1), qty: z.number().int().min(1).max(99) }))
    .min(1, "Elegí qué prendas devuelve")
    .max(30),
  /** Las prendas devueltas vuelven al stock (ya están en el taller). */
  restock: z.boolean().default(false),
  reason: z.string().trim().max(300).default(""),
});
export type ReturnInput = z.input<typeof ReturnInputSchema>;

export const MoveOrderInputSchema = z.object({ to: z.enum(BOARD_STATUSES) });
export const BulkAdvanceInputSchema = z.object({ numbers: z.array(z.string().min(1)).min(1).max(100) });
export const OrderNoteInputSchema = z.object({ note: z.string().trim().max(1000) });
/** Anular un pedido que espera pago (un link armado por error): el motivo queda en el historial. */
export const CancelOrderInputSchema = z.object({ reason: z.string().trim().max(300).default("") });
export type CancelOrderInput = z.input<typeof CancelOrderInputSchema>;

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
