import type {
  AutomationChannel,
  AutomationKey,
  AutomationRun,
  ReviewPoints,
  ShippingMethod,
} from "@mini-galu/contracts";

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
    /** Prendas sugeridas con foto (ej. ideas para el cumple). */
    products?: Suggestion[];
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
  /** Para los links al pedido sin cuenta (reseñas). */
  accessToken: string;
};

/** Lo que las automatizaciones leen y anotan de los pedidos. */
export interface AutomationOrders {
  find(orderId: string): Promise<OrderFacts | null>;
  /** Pedidos que pasaron a entregado entre esas fechas. */
  deliveredBetween(from: Date, to: Date): Promise<string[]>;
  /** Línea en el historial del pedido (hecha por el sistema). */
  log(orderId: string, title: string, detail: string | null): Promise<void>;
  /** Las reglas de los puntos por reseñas ("Tienda y pagos"): el pedido de reseña cuenta cuánto suma. */
  reviewPoints(): Promise<ReviewPoints>;
  /** El pedido y la prenda de una reseña (null: reseña demo, sin pedido). */
  reviewed(reviewId: string): Promise<{ orderId: string; product: string } | null>;
}

export type WaitingContact = { id: string; channel: "email" | "whatsapp"; contact: string };

/** Lista de espera de un talle ("avisame cuando vuelva"). */
export interface Waitlist {
  pending(productId: string, size: string): Promise<WaitingContact[]>;
  markNotified(ids: string[], at: Date): Promise<void>;
}

/** Un lanzamiento programado con el aviso prendido, y las prendas que salen (con foto). */
export type UpcomingLaunch = { id: string; title: string; startsAt: Date; products: Suggestion[] };

/** Anotados a un lanzamiento ("avisame cuando salga" de la home). */
export interface LaunchSignups {
  /** Programados, con el aviso prendido y sin publicar, que salen entre esas fechas. */
  startingBetween(from: Date, to: Date): Promise<UpcomingLaunch[]>;
  /** Anotados sin avisar, en el orden en que se anotaron. */
  pending(launchId: string): Promise<WaitingContact[]>;
  markNotified(ids: string[], at: Date): Promise<void>;
}

/** Talles publicados con una sola unidad. */
export interface LowStock {
  list(): Promise<{ key: string; label: string }[]>;
}

/** Una nena de "Mis nenas" con cumple cargado y la cuenta que la registró. */
export type ChildBirthday = {
  childId: string;
  name: string;
  /** "AAAA-MM-DD" */
  birthday: string;
  size: string | null;
  parentFirstName: string;
  email: string;
};

export interface Birthdays {
  list(): Promise<ChildBirthday[]>;
  /** El cupón "Mail de cumpleaños" vigente (lo resuelven los cupones): label "15% de descuento". */
  coupon(): Promise<{ code: string; label: string } | null>;
}

export type Suggestion = { name: string; priceCents: number; imageUrl: string; url: string };

/** Prendas publicadas con stock en un talle (lo resuelve el catálogo). */
export interface Suggestions {
  inSize(size: string, limit: number): Promise<Suggestion[]>;
}

/** Bolsa de una cuenta que quedó sin tocar, con lo que todavía tiene stock. */
export type IdleCart = {
  cartId: string;
  /** Último cambio de la bolsa: la clave del aviso (si la vuelve a tocar y la deja, se avisa de nuevo). */
  updatedAt: Date;
  firstName: string;
  lastName: string;
  email: string;
  /** Prendas publicadas con stock en el talle elegido, en el orden en que se sumaron. */
  items: (Suggestion & { size: string })[];
};

export interface IdleCarts {
  /**
   * Bolsas de clientes con cuenta cuyo último cambio fue entre esas fechas. Sin las que tienen un pedido esperando
   * el pago (de esas se ocupa el recordatorio del link).
   */
  between(from: Date, to: Date): Promise<IdleCart[]>;
}
