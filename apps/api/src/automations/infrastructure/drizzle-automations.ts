import type { AutomationKey, AutomationRun } from "@mini-galu/contracts";
import { and, type Db, desc, eq, gte, inArray, isNotNull, isNull, lte, schema as s, sql } from "@mini-galu/db";
import type {
  AutomationOrders,
  AutomationSettingsStore,
  Birthdays,
  LowStock,
  NewRun,
  RuleOverrides,
  RunLog,
  Waitlist,
} from "../application/ports";

const KEY = "automations";

/** Lo que el taller cambió de cada regla, en content_blocks["automations"]. */
export class DrizzleAutomationSettings implements AutomationSettingsStore {
  constructor(private readonly db: Db) {}

  async get(): Promise<RuleOverrides> {
    const [r] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, KEY));
    return (r?.value as RuleOverrides | undefined) ?? {};
  }

  async save(value: RuleOverrides) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value } });
  }
}

export class DrizzleRunLog implements RunLog {
  constructor(private readonly db: Db) {}

  async add(r: NewRun, at: Date) {
    await this.db.insert(s.automationRuns).values({ ...r, createdAt: at });
  }

  async recent(limit: number): Promise<AutomationRun[]> {
    const rows = await this.db.select().from(s.automationRuns).orderBy(desc(s.automationRuns.createdAt)).limit(limit);
    return rows.map((r) => ({
      id: r.id,
      rule: r.rule as AutomationKey,
      subject: r.subject,
      detail: r.detail,
      channel: r.channel as AutomationRun["channel"],
      status: r.status as AutomationRun["status"],
      at: r.createdAt.toISOString(),
    }));
  }

  async countsSince(since: Date) {
    const rows = await this.db
      .select({ rule: s.automationRuns.rule, n: sql<number>`count(*)::int` })
      .from(s.automationRuns)
      .where(gte(s.automationRuns.createdAt, since))
      .groupBy(s.automationRuns.rule);
    return Object.fromEntries(rows.map((r) => [r.rule, r.n])) as Partial<Record<AutomationKey, number>>;
  }

  async sentSince(since: Date) {
    const rows = await this.db
      .select({ channel: s.automationRuns.channel, n: sql<number>`count(*)::int` })
      .from(s.automationRuns)
      .where(and(gte(s.automationRuns.createdAt, since), eq(s.automationRuns.status, "ok")))
      .groupBy(s.automationRuns.channel);
    const n = (c: string) => rows.find((r) => r.channel === c)?.n ?? 0;
    return { mail: n("mail"), whatsapp: n("whatsapp") };
  }

  async exists(rule: AutomationKey, subjectKey: string) {
    const [r] = await this.db
      .select({ id: s.automationRuns.id })
      .from(s.automationRuns)
      .where(and(eq(s.automationRuns.rule, rule), eq(s.automationRuns.subjectKey, subjectKey)))
      .limit(1);
    return !!r;
  }

  async linkRecovery(since: Date) {
    const [r] = await this.db
      .select({
        reminded: sql<number>`count(*)::int`,
        recovered: sql<number>`count(*) filter (where ${s.orders.paidAt} > ${s.automationRuns.createdAt})::int`,
      })
      .from(s.automationRuns)
      .leftJoin(s.orders, eq(s.orders.id, s.automationRuns.orderId))
      .where(and(eq(s.automationRuns.rule, "link_sin_pagar"), gte(s.automationRuns.createdAt, since)));
    return { reminded: r?.reminded ?? 0, recovered: r?.recovered ?? 0 };
  }

  async waitlistSales(since: Date) {
    // pedidos pagados por el mismo mail, con la prenda avisada, hasta 14 días después del aviso
    const rows = await this.db.execute<{ count: number; cents: number }>(sql`
      select count(*)::int as count, coalesce(sum(x.total), 0)::int as cents
      from (
        select distinct o.id, o.total_cents as total
        from ${s.automationRuns} r
        join ${s.orders} o on lower(o.email) = r.contact
          and o.paid_at > r.created_at and o.paid_at < r.created_at + interval '14 days'
        join ${s.orderItems} i on i.order_id = o.id and i.product_slug = r.product_slug
        where r.rule = 'volvio_talle' and r.status = 'ok' and r.created_at >= ${since.toISOString()}::timestamptz
      ) x
    `);
    const r = rows[0];
    return { count: Number(r?.count ?? 0), cents: Number(r?.cents ?? 0) };
  }
}

export class DrizzleWaitlist implements Waitlist {
  constructor(private readonly db: Db) {}

  async pending(productId: string, size: string) {
    const rows = await this.db
      .select({ id: s.waitlistEntries.id, channel: s.waitlistEntries.channel, contact: s.waitlistEntries.contact })
      .from(s.waitlistEntries)
      .where(
        and(
          eq(s.waitlistEntries.productId, productId),
          eq(s.waitlistEntries.size, size),
          isNull(s.waitlistEntries.notifiedAt),
        ),
      )
      .orderBy(s.waitlistEntries.createdAt);
    return rows;
  }

  async markNotified(ids: string[], at: Date) {
    if (!ids.length) return;
    await this.db.update(s.waitlistEntries).set({ notifiedAt: at }).where(inArray(s.waitlistEntries.id, ids));
  }
}

export class DrizzleLowStock implements LowStock {
  constructor(private readonly db: Db) {}

  async list() {
    const rows = await this.db
      .select({ id: s.variants.id, size: s.variants.size, name: s.products.name, updatedAt: s.variants.updatedAt })
      .from(s.variants)
      .innerJoin(s.products, eq(s.products.id, s.variants.productId))
      .where(and(eq(s.variants.stock, 1), eq(s.products.status, "published")));
    // la clave lleva el día del último cambio del talle: si se repone y vuelve a quedar en 1, se avisa de nuevo
    return rows.map((r) => ({
      key: `stock:${r.id}:${r.updatedAt.toISOString().slice(0, 10)}`,
      label: `${r.name} T${r.size}`,
    }));
  }
}

/** Lectura de pedidos para las automatizaciones (y su línea en el historial). */
export class DrizzleAutomationOrders implements AutomationOrders {
  constructor(
    private readonly db: Db,
    private readonly pickupLabel: (slot: string) => string | null,
    private readonly formatNumber: (n: number) => string,
  ) {}

  async find(orderId: string) {
    const [o] = await this.db.select().from(s.orders).where(eq(s.orders.id, orderId));
    if (!o) return null;
    return {
      id: o.id,
      number: this.formatNumber(o.number),
      firstName: o.firstName,
      lastName: o.lastName,
      email: o.email,
      shippingMethod: o.shippingMethod,
      pickupLabel: o.pickupSlot ? this.pickupLabel(o.pickupSlot) : null,
    };
  }

  async deliveredBetween(from: Date, to: Date) {
    const rows = await this.db
      .selectDistinct({ id: s.orderEvents.orderId })
      .from(s.orderEvents)
      .innerJoin(s.orders, eq(s.orders.id, s.orderEvents.orderId))
      .where(
        and(
          eq(s.orderEvents.toStatus, "entregado"),
          eq(s.orders.status, "entregado"),
          gte(s.orderEvents.createdAt, from),
          lte(s.orderEvents.createdAt, to),
        ),
      );
    return rows.map((r) => r.id);
  }

  async log(orderId: string, title: string, detail: string | null) {
    await this.db.insert(s.orderEvents).values({ orderId, kind: "mail", title, detail, auto: true });
  }
}

/** Nenas con cumple cargado ("Mis nenas") y la cuenta que las registró. */
export class DrizzleBirthdays implements Birthdays {
  constructor(
    private readonly db: Db,
    readonly coupon: Birthdays["coupon"],
  ) {}

  async list() {
    const rows = await this.db
      .select({
        childId: s.children.id,
        name: s.children.name,
        birthday: s.children.birthday,
        size: s.children.size,
        parentFirstName: s.user.firstName,
        email: s.user.email,
      })
      .from(s.children)
      .innerJoin(s.user, eq(s.user.id, s.children.userId))
      .where(and(isNotNull(s.children.birthday), eq(s.user.role, "customer")));
    return rows.map((r) => ({ ...r, birthday: r.birthday ?? "" }));
  }
}
