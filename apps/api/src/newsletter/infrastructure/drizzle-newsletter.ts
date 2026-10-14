import { and, type Db, desc, eq, isNull, schema as s, sql } from "@mini-galu/db";
import type { LetterRepository, SubscriberRepository } from "../application/ports";

export class DrizzleSubscribers implements SubscriberRepository {
  constructor(private readonly db: Db) {}

  async findByEmail(email: string) {
    const [r] = await this.db.select().from(s.newsletterSubscribers).where(eq(s.newsletterSubscribers.email, email));
    return r ?? null;
  }

  async create(v: { email: string; source: string; token: string }) {
    const [r] = await this.db.insert(s.newsletterSubscribers).values(v).returning();
    if (!r) throw new Error("No se pudo guardar la suscripción");
    return r;
  }

  async resubscribe(id: string) {
    await this.db
      .update(s.newsletterSubscribers)
      .set({ unsubscribedAt: null })
      .where(eq(s.newsletterSubscribers.id, id));
  }

  async unsubscribe(token: string, at: Date) {
    const rows = await this.db
      .update(s.newsletterSubscribers)
      .set({ unsubscribedAt: at })
      .where(eq(s.newsletterSubscribers.token, token))
      .returning({ id: s.newsletterSubscribers.id });
    return rows.length > 0;
  }

  async active() {
    return this.db
      .select()
      .from(s.newsletterSubscribers)
      .where(isNull(s.newsletterSubscribers.unsubscribedAt))
      .orderBy(s.newsletterSubscribers.createdAt);
  }

  async countActive() {
    const [r] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.newsletterSubscribers)
      .where(and(isNull(s.newsletterSubscribers.unsubscribedAt)));
    return r?.n ?? 0;
  }
}

export class DrizzleLetters implements LetterRepository {
  constructor(private readonly db: Db) {}

  async create(v: { subject: string; body: string }) {
    const [r] = await this.db.insert(s.newsletterLetters).values(v).returning();
    if (!r) throw new Error("No se pudo guardar la carta");
    return r;
  }

  async markSent(id: string, recipients: number, at: Date) {
    await this.db.update(s.newsletterLetters).set({ recipients, sentAt: at }).where(eq(s.newsletterLetters.id, id));
  }

  async recent(limit: number) {
    return this.db.select().from(s.newsletterLetters).orderBy(desc(s.newsletterLetters.createdAt)).limit(limit);
  }
}
