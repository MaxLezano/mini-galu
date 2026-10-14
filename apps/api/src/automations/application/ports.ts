import type { AutomationChannel, AutomationKey, AutomationRun, ShippingMethod } from "@mini-galu/contracts";

/** Lo que el taller cambió de cada regla (lo que no está, va de fábrica). */
export type RuleOverrides = Partial<Record<AutomationKey, { on?: boolean; message?: string }>>;

export interface AutomationSettingsStore {
  get(): Promise<RuleOverrides>;
  save(v: RuleOverrides): Promise<void>;
}

export type NewRun = {
  rule: AutomationKey;
  subject: string;
  detail: string;
  channel: AutomationChannel;
  status: "ok" | "warn";
  /** Para no repetir un aviso (ej. "stock:<variante>", "resena:<pedido>"). */
  subjectKey?: string;
  orderId?: string;
  /** Mail del cliente avisado (para medir las ventas que vinieron del aviso). */
  contact?: string;
  productSlug?: string;
};

/** Registro de lo que se hizo solo. */
export interface RunLog {
  add(r: NewRun, at: Date): Promise<void>;
  recent(limit: number): Promise<AutomationRun[]>;
  countsSince(since: Date): Promise<Partial<Record<AutomationKey, number>>>;
  sentSince(since: Date): Promise<{ mail: number; whatsapp: number }>;
  exists(rule: AutomationKey, subjectKey: string): Promise<boolean>;
  /** Links con recordatorio desde `since` y cuántos se pagaron después del recordatorio. */
  linkRecovery(since: Date): Promise<{ reminded: number; recovered: number }>;
  /** Compras de la prenda avisada, por el mismo mail, hasta 14 días después del aviso. */
  waitlistSales(since: Date): Promise<{ count: number; cents: number }>;
}

/** Los mails al cliente (los arma el módulo de notificaciones). */
export interface Messenger {
  /** "Recibimos tu pago" con el detalle; devuelve a quién se mandó. */
  paymentApproved(orderId: string, intro: string): Promise<string | null>;
  paymentReminder(
    o: {
      number: string;
      firstName: string;
      email: string;
      totalCents: number;
      payUrl: string;
      reservedUntilLabel: string | null;
    },
    intro: string,
  ): Promise<void>;
  message(m: {
    to: string;
    subject: string;
    eyebrow: string;
    name: string | null;
    body: string;
    cta: { label: string; url: string } | null;
    number: string | null;
  }): Promise<void>;
}

export type OrderFacts = {
  id: string;
  number: string;
  firstName: string;
  lastName: string;
  email: string;
  shippingMethod: ShippingMethod;
  /** "Jue 8 · 10 a 13 h" */
  pickupLabel: string | null;
};

/** Lo que las automatizaciones leen y anotan de los pedidos. */
export interface AutomationOrders {
  find(orderId: string): Promise<OrderFacts | null>;
  /** Pedidos que pasaron a entregado entre esas fechas. */
  deliveredBetween(from: Date, to: Date): Promise<string[]>;
  /** Línea en el historial del pedido (hecha por el sistema). */
  log(orderId: string, title: string, detail: string | null): Promise<void>;
}

export type WaitingContact = { id: string; channel: "email" | "whatsapp"; contact: string };

/** Lista de espera de un talle ("avisame cuando vuelva"). */
export interface Waitlist {
  pending(productId: string, size: string): Promise<WaitingContact[]>;
  markNotified(ids: string[], at: Date): Promise<void>;
}

/** Talles publicados con una sola unidad. */
export interface LowStock {
  list(): Promise<{ key: string; label: string }[]>;
}
