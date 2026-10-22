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
  /** Lo que ya volvió en devoluciones parciales (por Mercado Pago o en efectivo, y a la gift card). */
  refundedCents: number;
  giftcardRefundedCents: number;
  channel: OrderChannel;
  statusChangedAt: Date;
  internalNote: string | null;
  /** Número de Andreani si ya tiene envío. */
  trackingNumber?: string | null;
  /** Si el cliente pidió la baja con el botón de arrepentimiento. */
  revocation?: Revocation | null;
  /** Por qué se canceló ("No se pagó a tiempo", "Anulado por el taller: …"). */
  cancelReason?: string | null;
  number: number;
  status: OrderStatus;
  reservedUntil: Date | null;
  paymentMethod: PaymentMethod | null;
  installments: number | null;
  paidAt: Date | null;
  createdAt: Date;
  items: (Omit<OrderItem, "variantId"> & { id: string; variantId: string | null; returnedQty: number })[];
};

/** Un talle de un modelo, con su stock (para el cambio de talle). */
export type SizeStock = { slug: string; variantId: string; size: string; stock: number };

/** Una devolución parcial: unidades de cada renglón y la plata que vuelve de cada medio. */
export type ItemsReturn = {
  items: { itemId: string; qty: number }[];
  cents: number;
  giftcardCents: number;
};

/** Cambio de talle de `qty` unidades de un renglón del pedido. */
export type SizeExchange = { itemId: string; toVariantId: string; toSize: string; qty: number; restock: boolean };

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

/** El pago aprobado de un pedido (o ya reintegrado), como lo guardó el módulo de pagos. */
export type OrderPayment = {
  provider: string;
  reference: string;
  status: string;
  /** Lo que pagó el cliente (con el interés de las cuotas): null si el proveedor no lo informa. */
  paidByCustomerCents: number | null;
  /** Lo que acreditó el proveedor después de su comisión: null si todavía no se sabe. */
  netCents: number | null;
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
  /** esperando_pago → cancelado devolviendo el stock. false si ya no estaba esperando pago. */
  cancelReleasing(id: string, reason: string, at: Date): Promise<boolean>;
  /**
   * Pasa a "reembolsado" solo si sigue en `from` (dos clics no reintegran dos veces). Con `restock`, las prendas que
   * no se devolvieron antes vuelven al stock y se restan de las vendidas, en la misma transacción.
   */
  markRefunded(id: string, from: OrderStatus, at: Date, restock: boolean): Promise<boolean>;
  /**
   * Aparta una devolución parcial antes de devolver la plata, en una transacción: suma las unidades devueltas de cada
   * renglón y lo devuelto del pedido. false si el pedido ya no está en `from` o esas unidades ya se devolvieron.
   */
  reserveReturn(orderId: string, from: OrderStatus, r: ItemsReturn): Promise<boolean>;
  /** Deshace `reserveReturn` (Mercado Pago no devolvió la plata). */
  undoReturn(orderId: string, r: ItemsReturn): Promise<void>;
  /** Esas unidades vuelven al stock y se restan de las vendidas. */
  restockItems(orderId: string, items: { itemId: string; qty: number }[]): Promise<void>;
  /** Los talles de esos modelos con su stock, en el orden del catálogo. */
  sizesOf(slugs: string[]): Promise<SizeStock[]>;
  /**
   * Cambia el talle de unidades de un renglón en una transacción: descuenta el talle nuevo y, con `restock`, devuelve
   * el anterior. Si son todas, el renglón pasa al talle nuevo; si no, se separa (o se suma al renglón de ese talle).
   * false si ya no hay stock del talle nuevo o el renglón cambió.
   */
  exchangeSize(orderId: string, x: SizeExchange): Promise<boolean>;
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
  /** Pedidos sin pagar hechos desde `since`: esperando pago o cancelados por reserva vencida. */
  unpaidSince(since: Date): Promise<string[]>;
  /** Pedidos esperando pago con la reserva vencida. */
  expired(now: Date): Promise<string[]>;
  /** "Avisos por WhatsApp" del seguimiento. */
  setWhatsappOptIn(id: string, on: boolean): Promise<void>;
  /** Corre la reserva de un pedido esperando pago hasta `until` (si vencía antes). false si no hizo falta o no espera pago. */
  extendReservation(id: string, until: Date): Promise<boolean>;
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

/** Lo que el reintegro de un pedido necesita del módulo de gift cards. */
export interface RefundGiftcards {
  /** Si la gift card que se compró con este pedido ya se usó (aunque sea una parte). */
  purchasedUsed(orderId: string): Promise<boolean>;
  /** Anula la gift card comprada con este pedido si sigue sin usar. false si ya se usó. */
  annulPurchased(orderId: string): Promise<boolean>;
  /** Vuelve a activar la que se anuló (Mercado Pago no pudo devolver la plata). */
  reactivatePurchased(orderId: string): Promise<void>;
  /**
   * Devuelve al saldo lo que este pedido usó de una gift card (una sola vez) o, con `cents`, hasta esa parte
   * (devolución parcial). Lo devuelto, en centavos.
   */
  restoreRedeemed(orderId: string, cents?: number): Promise<number>;
}

/** Solicitud del botón de arrepentimiento (una por pedido). */
export type Revocation = { code: string; at: Date; inTime: boolean; reason: string | null };

export interface RevocationStore {
  forOrder(orderId: string): Promise<Revocation | null>;
  /** Guarda la solicitud. Si el pedido ya tenía una (dos envíos a la vez), no la pisa y devuelve `created: false`. */
  save(orderId: string, r: Omit<Revocation, "at">): Promise<{ created: boolean; revocation: Revocation }>;
}
