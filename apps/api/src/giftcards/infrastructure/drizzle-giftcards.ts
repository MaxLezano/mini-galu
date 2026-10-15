import type { AccountGiftcard, GiftcardDesign } from "@mini-galu/contracts";
import {
  and,
  type Db,
  desc,
  eq,
  gte,
  isNotNull,
  isNull,
  lte,
  or,
  schema as s,
  sql,
  TransactionRollbackError,
} from "@mini-galu/db";
import type { GiftcardRecord, GiftcardRepository, NewGiftcard } from "../application/ports";

const toRecord = (r: typeof s.giftcards.$inferSelect): GiftcardRecord => ({
  id: r.id,
  orderId: r.orderId,
  code: r.code,
  status: r.status,
  amountCents: r.amountCents,
  balanceCents: r.balanceCents,
  design: r.design as GiftcardDesign,
  toName: r.toName,
  fromName: r.fromName,
  message: r.message,
  via: r.via as GiftcardRecord["via"],
  recipient: r.recipient,
  deliverAt: r.deliverAt,
  deliveredAt: r.deliveredAt,
  expiresAt: r.expiresAt,
});

export class DrizzleGiftcards implements GiftcardRepository {
  constructor(private readonly db: Db) {}

  async create(g: NewGiftcard) {
    const [row] = await this.db
      .insert(s.giftcards)
      .values({ ...g, balanceCents: g.amountCents })
      .returning();
    return toRecord(row as typeof s.giftcards.$inferSelect);
  }

  private async one(where: ReturnType<typeof eq>) {
    const [row] = await this.db.select().from(s.giftcards).where(where).limit(1);
    return row ? toRecord(row) : null;
  }
  byOrder(orderId: string) {
    return this.one(eq(s.giftcards.orderId, orderId));
  }
  byCode(code: string) {
    return this.one(eq(s.giftcards.code, code));
  }
  byId(id: string) {
    return this.one(eq(s.giftcards.id, id));
  }

  async activate(id: string, code: string, expiresAt: Date) {
    const rows = await this.db
      .update(s.giftcards)
      .set({ status: "activa", code, expiresAt })
      .where(and(eq(s.giftcards.id, id), eq(s.giftcards.status, "esperando_pago")))
      .returning({ id: s.giftcards.id });
    return rows.length > 0;
  }

  async markDelivered(id: string, at: Date) {
    await this.db.update(s.giftcards).set({ deliveredAt: at }).where(eq(s.giftcards.id, id));
  }

  async dueForDelivery(now: Date) {
    const rows = await this.db
      .select()
      .from(s.giftcards)
      .where(
        and(
          eq(s.giftcards.status, "activa"),
          isNull(s.giftcards.deliveredAt),
          isNotNull(s.giftcards.deliverAt),
          lte(s.giftcards.deliverAt, now),
        ),
      );
    return rows.map(toRecord);
  }

  async redeem(id: string, orderId: string, cents: number) {
    try {
      return await this.db.transaction(async (tx) => {
        const inserted = await tx
          .insert(s.giftcardRedemptions)
          .values({ giftcardId: id, orderId, amountCents: cents })
          .onConflictDoNothing()
          .returning({ id: s.giftcardRedemptions.id });
        if (!inserted.length) return "repetido" as const;
        const rows = await tx
          .update(s.giftcards)
          .set({ balanceCents: sql`${s.giftcards.balanceCents} - ${cents}` })
          .where(and(eq(s.giftcards.id, id), gte(s.giftcards.balanceCents, cents)))
          .returning({ id: s.giftcards.id });
        // el saldo se usó en otro pedido mientras este se pagaba: no se registra el uso
        if (!rows.length) tx.rollback();
        return "ok" as const;
      });
    } catch (e) {
      if (e instanceof TransactionRollbackError) return "sin_saldo";
      throw e;
    }
  }

  async annulUnused(orderId: string) {
    const rows = await this.db
      .update(s.giftcards)
      .set({ status: "anulada" })
      .where(
        and(
          eq(s.giftcards.orderId, orderId),
          eq(s.giftcards.status, "activa"),
          eq(s.giftcards.balanceCents, s.giftcards.amountCents),
        ),
      )
      .returning({ id: s.giftcards.id });
    return rows.length > 0;
  }

  async reactivate(orderId: string) {
    await this.db
      .update(s.giftcards)
      .set({ status: "activa" })
      .where(and(eq(s.giftcards.orderId, orderId), eq(s.giftcards.status, "anulada")));
  }

  async restoreRedemption(orderId: string) {
    return this.db.transaction(async (tx) => {
      const used = await tx
        .delete(s.giftcardRedemptions)
        .where(eq(s.giftcardRedemptions.orderId, orderId))
        .returning({ giftcardId: s.giftcardRedemptions.giftcardId, cents: s.giftcardRedemptions.amountCents });
      for (const u of used)
        await tx
          .update(s.giftcards)
          .set({ balanceCents: sql`${s.giftcards.balanceCents} + ${u.cents}` })
          .where(eq(s.giftcards.id, u.giftcardId));
      return used.reduce((a, u) => a + u.cents, 0);
    });
  }

  async active() {
    const rows = await this.db
      .select()
      .from(s.giftcards)
      .where(eq(s.giftcards.status, "activa"))
      .orderBy(desc(s.giftcards.createdAt));
    return rows.map(toRecord);
  }

  async forEmail(email: string): Promise<AccountGiftcard[]> {
    const rows = await this.db
      .select({ card: s.giftcards, buyer: s.orders.email })
      .from(s.giftcards)
      .innerJoin(s.orders, eq(s.orders.id, s.giftcards.orderId))
      .where(or(eq(s.orders.email, email), and(eq(s.giftcards.recipient, email), isNotNull(s.giftcards.deliveredAt))))
      .orderBy(desc(s.giftcards.createdAt));
    return rows
      .filter((r) => r.card.status !== "esperando_pago")
      .map(({ card: c, buyer }) => ({
        code: c.code,
        amountCents: c.amountCents,
        balanceCents: c.balanceCents,
        toName: c.toName,
        status: c.status,
        expiresAt: c.expiresAt?.toISOString() ?? null,
        mine: buyer === email ? "compre" : "recibi",
      }));
  }
}
