import type { OrderChannel, OrderStatus, PaymentMethod, ShippingMethod } from "@mini-galu/contracts";
import type { PaidOrder } from "../domain/stats";

/** Dirección tal como la cargó el cliente al comprar. */
export type ShippingAddress = {
  street: string;
  number: string;
  unit: string | null;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
};

export type OrderItem = {
  variantId: string;
  productSlug: string;
  name: string;
  colorName: string;
  size: string;
  imagePath: string | null;
  unitPriceCents: number;
  qty: number;
};

export type NewOrder = {
  cartId: string | null;
  userId: string | null;
  accessToken: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  whatsappOptIn: boolean;
  shippingMethod: ShippingMethod;
  shippingAddress: ShippingAddress | null;
  /** Sucursal del correo donde retira (envío a sucursal). */
  shippingBranch: { id: string; name: string; address: string } | null;
  postalCode: string | null;
  province: string | null;
  pickupSlot: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  couponId: string | null;
  couponCode: string | null;
  reservedUntil: Date;
  /** Por dónde entró la venta (la web por defecto; los links de pago dicen WhatsApp o Instagram). */
  channel?: OrderChannel;
  /** Prendas de una lista de cumple que se regalan con este pedido. */
  wishItemIds?: string[] | null;
  /** prendas (por defecto) · giftcard: la compra de una gift card, sin prendas ni envío. */
  kind?: "prendas" | "giftcard";
  /** Gift card con la que se paga parte (o todo) del pedido y cuánto se usa de su saldo. */
  giftcardId?: string | null;
  giftcardCents?: number;
  items: OrderItem[];
};

export type OrderRecord = Omit<NewOrder, "items" | "reservedUntil" | "channel" | "kind" | "giftcardCents"> & {
  id: string;
  kind: "prendas" | "giftcard";
  giftcardCents: number;
  channel: OrderChannel;
  statusChangedAt: Date;
  internalNote: string | null;
  /** Número de Andreani si ya tiene envío. */
  trackingNumber?: string | null;
  number: number;
  status: OrderStatus;
  reservedUntil: Date | null;
  paymentMethod: PaymentMethod | null;
  installments: number | null;
  paidAt: Date | null;
  createdAt: Date;
  items: (Omit<OrderItem, "variantId"> & { variantId: string | null })[];
};

export type ReserveResult =
  | { ok: true; id: string; number: number }
  | { ok: false; productSlug: string; name: string; size: string; available: number };

/** Una línea del historial del pedido. `auto`: lo hizo el sistema (pago, mail…), no alguien del taller. */
export type OrderEvent = {
  kind: string;
  title: string;
  detail: string | null;
  auto: boolean;
  at: Date;
  /** En los cambios de estado: a cuál pasó. */
  toStatus?: OrderStatus | null;
};

export interface OrderEvents {
  addEvent(orderId: string, e: Omit<OrderEvent, "at">): Promise<void>;
}

/** El pago aprobado de un pedido, como lo guardó el módulo de pagos. */
export type OrderPayment = {
  provider: string;
  reference: string;
  status: string;
  /** Lo que pagó el cliente (con el interés de las cuotas): null si el proveedor no lo informa. */
  paidByCustomerCents: number | null;
};

/** Lo que necesita el panel del taller (tablero, detalle, mover de estado). */
export interface AdminOrderRepository extends OrderEvents {
  /** Pedidos del tablero: sin cancelados y sin los checkouts web que todavía esperan el pago. */
  listForBoard(): Promise<OrderRecord[]>;
  findByNumber(number: number): Promise<OrderRecord | null>;
  events(orderId: string): Promise<OrderEvent[]>;
  approvedPayment(orderId: string): Promise<OrderPayment | null>;
  /** Cambia de estado solo si sigue en `from` (dos pestañas no pisan el cambio de la otra). */
  setStatus(id: string, from: OrderStatus, to: OrderStatus, at: Date): Promise<boolean>;
  setNote(id: string, note: string | null): Promise<void>;
  /** Pedidos pagados desde `since` (sin cancelados ni reembolsados), para el resumen. */
  paidSince(since: Date): Promise<PaidOrder[]>;
  /** De esos emails, los que ya habían pagado algún pedido antes de `before`. */
  buyersBefore(before: Date, emails: string[]): Promise<Set<string>>;
  /** Últimas líneas del historial que hizo el sistema solo (sin "pedido creado" ni reservas vencidas). */
  recentAutoEvents(limit: number): Promise<(OrderEvent & { orderNumber: number; customer: string })[]>;
}

export interface OrderRepository extends OrderEvents {
  /** Crea el pedido y descuenta el stock en la misma transacción. Si un talle no alcanza, no crea nada. */
  createReserving(order: NewOrder): Promise<ReserveResult>;
  findById(id: string): Promise<OrderRecord | null>;
  findByNumber(number: number): Promise<OrderRecord | null>;
  /** Pedidos esperando pago hechos desde esa bolsa. */
  pendingForCart(cartId: string): Promise<string[]>;
  /** Links de pago (no web) esperando pago, creados antes de `createdBefore` y todavía sin recordatorio. */
  linksToRemind(createdBefore: Date): Promise<OrderRecord[]>;
  /** Pedidos esperando pago con la reserva vencida. */
  expired(now: Date): Promise<string[]>;
  /** esperando_pago → cancelado devolviendo el stock. false si ya no estaba esperando pago. */
  cancelReleasing(id: string, reason: string, at: Date): Promise<boolean>;
  /** esperando_pago → nuevo y suma a las vendidas. false si ya no estaba esperando pago. */
  /** Cambia cupón y totales de un pedido que espera pago (sin tocar la reserva). false si ya no espera pago. */
  updateTotals(
    id: string,
    t: {
      discountCents: number;
      shippingCents: number;
      giftcardCents: number;
      totalCents: number;
      couponId: string | null;
      couponCode: string | null;
    },
  ): Promise<boolean>;
  markPaid(
    id: string,
    payment: { method: PaymentMethod | null; installments: number | null; at: Date },
  ): Promise<boolean>;
  /** Un pedido cancelado por vencimiento que igual se pagó: vuelve a reservar si hay stock (y queda esperando pago). */
  reReserve(id: string): Promise<boolean>;
}
