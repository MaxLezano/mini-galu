import type { AccountGiftcard, GiftcardDesign } from "@mini-galu/contracts";

export type GiftcardRecord = {
  id: string;
  orderId: string;
  code: string | null;
  status: "esperando_pago" | "activa" | "anulada";
  amountCents: number;
  balanceCents: number;
  design: GiftcardDesign;
  toName: string;
  fromName: string;
  message: string | null;
  via: "mail" | "whatsapp";
  recipient: string;
  deliverAt: Date | null;
  deliveredAt: Date | null;
  expiresAt: Date | null;
};

export type NewGiftcard = Omit<GiftcardRecord, "id" | "code" | "status" | "balanceCents" | "deliveredAt" | "expiresAt">;

export interface GiftcardRepository {
  create(g: NewGiftcard): Promise<GiftcardRecord>;
  byOrder(orderId: string): Promise<GiftcardRecord | null>;
  byCode(code: string): Promise<GiftcardRecord | null>;
  byId(id: string): Promise<GiftcardRecord | null>;
  /** esperando_pago → activa con su código y vencimiento. false si ya estaba activa. */
  activate(id: string, code: string, expiresAt: Date): Promise<boolean>;
  markDelivered(id: string, at: Date): Promise<void>;
  /** Activas, sin mandar, con fecha de envío cumplida. */
  dueForDelivery(now: Date): Promise<GiftcardRecord[]>;
  /**
   * Descuenta del saldo lo que pagó un pedido, una sola vez por pedido y solo si alcanza (en la misma transacción).
   * "repetido": ese pedido ya la había usado · "sin_saldo": se gastó en otro pedido mientras este se pagaba.
   */
  redeem(id: string, orderId: string, cents: number): Promise<"ok" | "repetido" | "sin_saldo">;
  /** Anula la gift card comprada con ese pedido si está activa y sin usar. false si no (ya se usó). */
  annulUnused(orderId: string): Promise<boolean>;
  /** La anulada de ese pedido vuelve a estar activa. */
  reactivate(orderId: string): Promise<void>;
  /**
   * Borra el uso que hizo ese pedido y le devuelve el saldo a la gift card (en la misma transacción). Con `cents`,
   * devuelve hasta esa parte y el uso queda por lo que falta (devolución parcial). Lo devuelto.
   */
  restoreRedemption(orderId: string, cents?: number): Promise<number>;
  /** Todas las pagadas (activas), las más nuevas primero. */
  active(): Promise<GiftcardRecord[]>;
  /** Las que compró ese mail y las que se mandaron a ese mail. */
  forEmail(email: string): Promise<AccountGiftcard[]>;
}

/** Lo que las gift cards necesitan del módulo de pedidos. */
export interface GiftcardOrders {
  /** Crea el pedido (tipo gift card, sin prendas ni envío) que se paga con Mercado Pago. */
  create(o: {
    buyer: { email: string; firstName: string; lastName: string; phone: string; whatsappOptIn: boolean };
    amountCents: number;
  }): Promise<{ orderId: string; number: string; accessToken: string }>;
  /** La compra ya pagada no tiene nada que preparar: se cierra como entregada. */
  close(orderId: string): Promise<void>;
  /** Línea en el historial del pedido (hecha por el sistema). */
  log(orderId: string, title: string, detail: string | null): Promise<void>;
  /** Quién la compró (para el mail con el código) y cuánto de gift card usó un pedido de prendas. */
  find(orderId: string): Promise<{
    kind: "prendas" | "giftcard";
    email: string;
    firstName: string;
    giftcardId: string | null;
    giftcardCents: number;
  } | null>;
}

/** Los mails de las gift cards (los arma el módulo de notificaciones). */
export interface GiftcardMailer {
  toRecipient(to: string, card: GiftcardRecord & { code: string; expiresAt: Date }): Promise<void>;
  toBuyer(to: string, card: GiftcardRecord & { code: string; expiresAt: Date }): Promise<void>;
}
