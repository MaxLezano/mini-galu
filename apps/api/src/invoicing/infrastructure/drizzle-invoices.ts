import { and, asc, type Db, eq, inArray, isNull, lte, schema as s, sql } from "@mini-galu/db";
import type { InvoiceRepository, NewInvoice } from "../application/ports";
import type { Invoice } from "../domain/invoice";
import type { ArcaTicket, ArcaTicketStore } from "./arca/wsaa";

type Row = typeof s.invoices.$inferSelect;
const toInvoice = ({ updatedAt: _u, ...r }: Row): Invoice => r;

export class DrizzleInvoices implements InvoiceRepository {
  constructor(
    private readonly db: Db,
    private readonly orderNumber: (n: number) => string,
  ) {}

  async create(i: NewInvoice) {
    const [r] = await this.db.insert(s.invoices).values(i).onConflictDoNothing().returning();
    return r ? toInvoice(r) : null;
  }

  async get(id: string) {
    const [r] = await this.db.select().from(s.invoices).where(eq(s.invoices.id, id));
    return r ? toInvoice(r) : null;
  }

  async byOrder(orderId: string) {
    const rows = await this.db
      .select()
      .from(s.invoices)
      .where(eq(s.invoices.orderId, orderId))
      .orderBy(asc(s.invoices.createdAt));
    return rows.map(toInvoice);
  }

  async byNumber(simulated: boolean, cbteType: number, pointOfSale: number, number: number) {
    const [r] = await this.db
      .select()
      .from(s.invoices)
      .where(
        and(
          eq(s.invoices.status, "emitida"),
          eq(s.invoices.simulated, simulated),
          eq(s.invoices.cbteType, cbteType),
          eq(s.invoices.pointOfSale, pointOfSale),
          eq(s.invoices.number, number),
        ),
      );
    return r ? toInvoice(r) : null;
  }

  async due(now: Date) {
    const rows = await this.db
      .select()
      .from(s.invoices)
      .where(and(inArray(s.invoices.status, ["pendiente", "error"]), lte(s.invoices.nextAttemptAt, now)))
      .orderBy(asc(s.invoices.createdAt));
    return rows.map(toInvoice);
  }

  async problems() {
    const rows = await this.db
      .select({ i: s.invoices, number: s.orders.number })
      .from(s.invoices)
      .innerJoin(s.orders, eq(s.orders.id, s.invoices.orderId))
      .where(eq(s.invoices.status, "error"))
      .orderBy(asc(s.invoices.createdAt));
    return rows.map((r) => ({ ...toInvoice(r.i), orderNumber: this.orderNumber(r.number) }));
  }

  async maxNumber(simulated: boolean, cbteType: number, pointOfSale: number) {
    const [r] = await this.db
      .select({ n: sql<number>`coalesce(max(${s.invoices.number}), 0)::int` })
      .from(s.invoices)
      .where(
        and(
          eq(s.invoices.status, "emitida"),
          eq(s.invoices.simulated, simulated),
          eq(s.invoices.cbteType, cbteType),
          eq(s.invoices.pointOfSale, pointOfSale),
        ),
      );
    return r?.n ?? 0;
  }

  async attempting(id: string, a: Pick<Invoice, "pointOfSale" | "data"> & { number: number; issuedOn: string }) {
    await this.db
      .update(s.invoices)
      .set({ ...a, updatedAt: new Date() })
      .where(eq(s.invoices.id, id));
  }

  async issued(id: string, r: { number: number; issuedOn: string; cae: string; caeExpiresOn: string }) {
    await this.db
      .update(s.invoices)
      .set({ ...r, status: "emitida", lastError: null, nextAttemptAt: null, updatedAt: new Date() })
      .where(eq(s.invoices.id, id));
  }

  async failed(id: string, r: { status: "pendiente" | "error"; error: string; nextAttemptAt: Date | null }) {
    await this.db
      .update(s.invoices)
      .set({
        status: r.status,
        lastError: r.error.slice(0, 500),
        nextAttemptAt: r.nextAttemptAt,
        attempts: sql`${s.invoices.attempts} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(s.invoices.id, id));
  }

  async annul(id: string) {
    await this.db
      .update(s.invoices)
      .set({ status: "anulada", nextAttemptAt: null, updatedAt: new Date() })
      .where(eq(s.invoices.id, id));
  }

  async markMailed(id: string, at: Date) {
    const r = await this.db
      .update(s.invoices)
      .set({ mailedAt: at })
      .where(and(eq(s.invoices.id, id), isNull(s.invoices.mailedAt)))
      .returning({ id: s.invoices.id });
    return r.length > 0;
  }
}

/** El ticket de ARCA se guarda en la base: sobrevive a un reinicio (ARCA no da otro mientras siga vigente). */
export class DrizzleArcaTickets implements ArcaTicketStore {
  constructor(private readonly db: Db) {}

  async get(service: string): Promise<ArcaTicket | null> {
    const [r] = await this.db.select().from(s.arcaTokens).where(eq(s.arcaTokens.service, service));
    return r ?? null;
  }

  async save(service: string, t: ArcaTicket) {
    await this.db
      .insert(s.arcaTokens)
      .values({ service, ...t })
      .onConflictDoUpdate({ target: s.arcaTokens.service, set: t });
  }
}
