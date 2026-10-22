import {
  type AutomationKey,
  type AutomationRun,
  DEFAULT_POLICIES,
  type MonthlyReport,
  type ReviewPoints,
} from "@mini-galu/contracts";
import type {
  AutomationOrders,
  AutomationSettingsStore,
  Birthdays,
  ChildBirthday,
  IdleCart,
  IdleCarts,
  LaunchSignups,
  LowStock,
  Messenger,
  NewRun,
  OrderFacts,
  RuleOverrides,
  RunLog,
  Suggestion,
  Suggestions,
  UpcomingLaunch,
  WaitingContact,
  Waitlist,
  WhatsApp,
} from "../application/ports";

export class MemoryAutomationSettings implements AutomationSettingsStore {
  value: RuleOverrides = {};
  async get() {
    return structuredClone(this.value);
  }
  async save(v: RuleOverrides) {
    this.value = structuredClone(v);
  }
}

export class MemoryRunLog implements RunLog {
  list: (NewRun & { at: Date })[] = [];
  /** Pedidos pagados: id → fecha de pago (para medir los links recuperados). */
  paid = new Map<string, Date>();
  async add(r: NewRun, at: Date) {
    this.list.push({ ...r, at });
  }
  async recent(limit: number): Promise<AutomationRun[]> {
    return [...this.list]
      .reverse()
      .slice(0, limit)
      .map((r, i) => ({
        id: String(i),
        rule: r.rule,
        subject: r.subject,
        detail: r.detail,
        channel: r.channel,
        status: r.status,
        at: r.at.toISOString(),
      }));
  }
  async countsSince(since: Date) {
    const out: Partial<Record<AutomationKey, number>> = {};
    for (const r of this.list)
      if (r.at >= since && !(r.channel === "whatsapp" && r.orderId)) out[r.rule] = (out[r.rule] ?? 0) + 1;
    return out;
  }
  async sentSince(since: Date) {
    const ok = this.list.filter((r) => r.at >= since && r.status === "ok" && r.rule !== "reporte_mensual");
    return {
      mail: ok.filter((r) => r.channel === "mail").length,
      whatsapp: ok.filter((r) => r.channel === "whatsapp").length,
    };
  }
  async exists(rule: AutomationKey, subjectKey: string) {
    return this.list.some((r) => r.rule === rule && r.subjectKey === subjectKey);
  }
  async linkRecovery(since: Date) {
    const reminded = this.list.filter((r) => r.rule === "link_sin_pagar" && r.channel === "mail" && r.at >= since);
    const recovered = reminded.filter((r) => {
      const paid = r.orderId ? this.paid.get(r.orderId) : undefined;
      return paid && paid > r.at;
    });
    return { reminded: reminded.length, recovered: recovered.length };
  }
  async waitlistSales() {
    return { count: 0, cents: 0 };
  }
}

export class MemoryMessenger implements Messenger {
  sent: {
    kind: "pago" | "recordatorio" | "mensaje";
    to: string;
    subject?: string;
    eyebrow?: string;
    body: string;
    products?: Suggestion[];
  }[] = [];
  /** Botón de cada mensaje (en el orden de `sent`). */
  ctas: ({ label: string; url: string } | null)[] = [];
  constructor(private readonly emails: Map<string, string> = new Map()) {}
  async paymentApproved(orderId: string, intro: string) {
    const to = this.emails.get(orderId) ?? null;
    if (to) this.sent.push({ kind: "pago", to, body: intro });
    return to;
  }
  async paymentReminder(o: { email: string }, intro: string) {
    this.sent.push({ kind: "recordatorio", to: o.email, body: intro });
  }
  async message(m: {
    to: string;
    subject: string;
    eyebrow: string;
    body: string;
    cta: { label: string; url: string } | null;
    products?: Suggestion[];
  }) {
    this.sent.push({
      kind: "mensaje",
      to: m.to,
      subject: m.subject,
      body: m.body,
      ...(m.products ? { eyebrow: m.eyebrow, products: m.products } : {}),
    });
    this.ctas.push(m.cta);
  }
  /** Reportes del mes que mandaría (a quién, de qué mes y el link al panel). */
  reports: { to: string; month: string; url: string }[] = [];
  async monthlyReport(to: string, report: MonthlyReport, url: string) {
    this.reports.push({ to, month: report.month, url });
  }
}

/** WhatsApp que guarda lo que mandaría; `failFor` simula un número que Meta no acepta. */
export class MemoryWhatsApp implements WhatsApp {
  readonly mode = "simulado";
  sent: Parameters<WhatsApp["send"]>[0][] = [];
  failFor = new Set<string>();
  async send(m: Parameters<WhatsApp["send"]>[0]) {
    if (this.failFor.has(m.to)) throw new Error("(#131026) Message undeliverable");
    this.sent.push(m);
  }
}

export class MemoryAutomationOrders implements AutomationOrders {
  orders = new Map<string, OrderFacts>();
  delivered = new Map<string, Date>();
  history: { orderId: string; title: string }[] = [];
  points: ReviewPoints = { ...DEFAULT_POLICIES.reviewPoints, enabled: false };
  /** reseña → pedido y prenda */
  reviews = new Map<string, { orderId: string; product: string }>();
  async find(id: string) {
    return this.orders.get(id) ?? null;
  }
  async deliveredBetween(from: Date, to: Date) {
    return [...this.delivered].filter(([, at]) => at >= from && at <= to).map(([id]) => id);
  }
  async log(orderId: string, title: string) {
    this.history.push({ orderId, title });
  }
  async reviewPoints() {
    return this.points;
  }
  async reviewed(reviewId: string) {
    return this.reviews.get(reviewId) ?? null;
  }
}

export class MemoryWaitlist implements Waitlist {
  entries: (WaitingContact & { productId: string; size: string; notifiedAt: Date | null })[] = [];
  async pending(productId: string, size: string) {
    return this.entries.filter((e) => e.productId === productId && e.size === size && !e.notifiedAt);
  }
  async markNotified(ids: string[], at: Date) {
    for (const e of this.entries) if (ids.includes(e.id)) e.notifiedAt = at;
  }
}

export class MemoryLowStock implements LowStock {
  items: { key: string; label: string }[] = [];
  async list() {
    return this.items;
  }
}

export class MemoryBirthdays implements Birthdays {
  children: ChildBirthday[] = [];
  currentCoupon: { code: string; label: string } | null = null;
  async list() {
    return this.children;
  }
  async coupon() {
    return this.currentCoupon;
  }
}

export class MemorySuggestions implements Suggestions {
  bySize = new Map<string, Suggestion[]>();
  async inSize(size: string, limit: number) {
    return (this.bySize.get(size) ?? []).slice(0, limit);
  }
}

export class MemoryIdleCarts implements IdleCarts {
  list: IdleCart[] = [];
  async between(from: Date, to: Date) {
    return this.list.filter((c) => c.updatedAt >= from && c.updatedAt <= to);
  }
}

export class MemoryLaunchSignups implements LaunchSignups {
  launches: UpcomingLaunch[] = [];
  signups: (WaitingContact & { launchId: string; notifiedAt: Date | null })[] = [];
  async startingBetween(from: Date, to: Date) {
    return this.launches.filter((l) => l.startsAt >= from && l.startsAt <= to);
  }
  async pending(launchId: string) {
    return this.signups.filter((s) => s.launchId === launchId && !s.notifiedAt);
  }
  async markNotified(ids: string[], at: Date) {
    for (const s of this.signups) if (ids.includes(s.id)) s.notifiedAt = at;
  }
}
