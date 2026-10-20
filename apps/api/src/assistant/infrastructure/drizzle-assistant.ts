import type { AssistantFact, AssistantFactInput, AssistantSettings } from "@mini-galu/contracts";
import { and, asc, type Db, desc, eq, gte, inArray, isNotNull, isNull, lt, or, schema as s, sql } from "@mini-galu/db";
import type {
  AssistantSettingsStore,
  ChatOwner,
  ConversationLog,
  ConversationRecord,
  FactStore,
  NewChatMessage,
} from "../application/ports";

/** Una charla "terminó en compra" si se pagó un pedido de esa cuenta o esa bolsa hasta 3 días después. */
const BOUGHT_WITHIN_MS = 3 * 86_400_000;

type Conversation = typeof s.assistantConversations.$inferSelect;
type PaidOrder = {
  number: number;
  totalCents: number;
  firstName: string;
  lastName: string;
  userId: string | null;
  cartToken: string | null;
  paidAt: Date;
};

const initial = (first: string, last: string) => `${first.trim()} ${last.trim().charAt(0).toUpperCase()}.`.trim();

export class DrizzleConversationLog implements ConversationLog {
  constructor(private readonly db: Db) {}

  async append(c: { id: string; owner: ChatOwner; productSlug: string | null }, msgs: NewChatMessage[], at: Date) {
    await this.db.transaction(async (tx) => {
      await tx
        .insert(s.assistantConversations)
        .values({
          id: c.id,
          userId: c.owner.userId,
          cartToken: c.owner.cartToken,
          productSlug: c.productSlug,
          startedAt: at,
          lastAt: at,
        })
        .onConflictDoUpdate({
          target: s.assistantConversations.id,
          // si ingresó a mitad de la charla, queda la cuenta
          set: {
            lastAt: at,
            userId: sql`coalesce(${s.assistantConversations.userId}, excluded.user_id)`,
            cartToken: sql`coalesce(${s.assistantConversations.cartToken}, excluded.cart_token)`,
          },
        });
      // el orden dentro del mismo instante: la pregunta antes que la respuesta
      await tx.insert(s.assistantMessages).values(
        msgs.map((m, i) => ({
          conversationId: c.id,
          role: m.role,
          text: m.text,
          unanswered: m.unanswered,
          sizeAlert: m.sizeAlert,
          createdAt: new Date(at.getTime() + i),
        })),
      );
    });
  }

  async recent(since: Date, limit: number): Promise<ConversationRecord[]> {
    const convs = await this.db
      .select()
      .from(s.assistantConversations)
      .where(gte(s.assistantConversations.lastAt, since))
      .orderBy(desc(s.assistantConversations.lastAt))
      .limit(limit);
    if (!convs.length) return [];
    const ids = convs.map((c) => c.id);
    const userIds = [...new Set(convs.flatMap((c) => c.userId ?? []))];
    const [msgs, users, orders] = await Promise.all([
      this.db
        .select()
        .from(s.assistantMessages)
        .where(inArray(s.assistantMessages.conversationId, ids))
        .orderBy(asc(s.assistantMessages.createdAt)),
      userIds.length
        ? this.db
            .select({ id: s.user.id, firstName: s.user.firstName, lastName: s.user.lastName })
            .from(s.user)
            .where(inArray(s.user.id, userIds))
        : [],
      this.paidOrders(convs),
    ]);
    return convs.map((c) => {
      const order = this.orderFor(c, orders);
      const u = users.find((x) => x.id === c.userId);
      const who = u?.firstName
        ? initial(u.firstName, u.lastName)
        : order
          ? initial(order.firstName, order.lastName)
          : null;
      return {
        id: c.id,
        who,
        startedAt: c.startedAt.toISOString(),
        lastAt: c.lastAt.toISOString(),
        order: order ? { number: order.number, totalCents: order.totalCents } : null,
        messages: msgs
          .filter((m) => m.conversationId === c.id)
          .map((m) => ({
            role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
            text: m.text,
            unanswered: m.unanswered,
            taught: !!m.taughtAt,
            sizeAlert: m.sizeAlert,
          })),
      };
    });
  }

  async stats(from: Date, to: Date | null) {
    const convs = await this.db
      .select()
      .from(s.assistantConversations)
      .where(
        and(gte(s.assistantConversations.startedAt, from), to ? lt(s.assistantConversations.startedAt, to) : undefined),
      );
    const orders = await this.paidOrders(convs);
    // un mismo pedido cuenta una vez aunque haya charlado varias veces
    const bought = new Map<number, number>();
    for (const c of convs) {
      const o = this.orderFor(c, orders);
      if (o) bought.set(o.number, o.totalCents);
    }
    return { chats: convs.length, bought: bought.size, boughtCents: [...bought.values()].reduce((a, b) => a + b, 0) };
  }

  async sizeAlerts(since: Date) {
    const [row] = await this.db
      .select({ n: sql<number>`count(*)::int` })
      .from(s.assistantMessages)
      .where(and(isNotNull(s.assistantMessages.sizeAlert), gte(s.assistantMessages.createdAt, since)));
    return row?.n ?? 0;
  }

  async unanswered(since: Date) {
    const rows = await this.db
      .select({
        id: s.assistantMessages.id,
        question: s.assistantMessages.unanswered,
        at: s.assistantMessages.createdAt,
      })
      .from(s.assistantMessages)
      .where(
        and(
          isNotNull(s.assistantMessages.unanswered),
          isNull(s.assistantMessages.taughtAt),
          gte(s.assistantMessages.createdAt, since),
        ),
      );
    return rows.map((r) => ({ id: r.id, question: r.question ?? "", at: r.at }));
  }

  async markTaught(ids: string[], at: Date) {
    if (!ids.length) return;
    await this.db.update(s.assistantMessages).set({ taughtAt: at }).where(inArray(s.assistantMessages.id, ids));
  }

  /** Pedidos de prendas pagados por esas cuentas o bolsas desde la primera charla. */
  private async paidOrders(convs: Conversation[]): Promise<PaidOrder[]> {
    const userIds = [...new Set(convs.flatMap((c) => c.userId ?? []))];
    const tokens = [...new Set(convs.flatMap((c) => c.cartToken ?? []))];
    if (!userIds.length && !tokens.length) return [];
    const from = new Date(Math.min(...convs.map((c) => c.startedAt.getTime())));
    const who = [
      ...(userIds.length ? [inArray(s.orders.userId, userIds)] : []),
      ...(tokens.length ? [inArray(s.carts.token, tokens)] : []),
    ];
    const rows = await this.db
      .select({
        number: s.orders.number,
        totalCents: s.orders.totalCents,
        firstName: s.orders.firstName,
        lastName: s.orders.lastName,
        userId: s.orders.userId,
        cartToken: s.carts.token,
        paidAt: s.orders.paidAt,
      })
      .from(s.orders)
      .leftJoin(s.carts, eq(s.carts.id, s.orders.cartId))
      .where(and(eq(s.orders.kind, "prendas"), isNotNull(s.orders.paidAt), gte(s.orders.paidAt, from), or(...who)))
      .orderBy(asc(s.orders.paidAt));
    return rows.flatMap((r) => (r.paidAt ? [{ ...r, paidAt: r.paidAt }] : []));
  }

  /** El primer pedido pagado de esa cuenta o bolsa entre el inicio de la charla y 3 días después de la última pregunta. */
  private orderFor(c: Conversation, orders: PaidOrder[]): PaidOrder | null {
    const until = c.lastAt.getTime() + BOUGHT_WITHIN_MS;
    return (
      orders.find(
        (o) =>
          ((c.userId && o.userId === c.userId) || (c.cartToken && o.cartToken === c.cartToken)) &&
          o.paidAt >= c.startedAt &&
          o.paidAt.getTime() <= until,
      ) ?? null
    );
  }
}

export class DrizzleFacts implements FactStore {
  constructor(private readonly db: Db) {}

  async list(): Promise<AssistantFact[]> {
    const rows = await this.db.select().from(s.assistantFacts).orderBy(desc(s.assistantFacts.createdAt));
    return rows.map((r) => ({
      id: r.id,
      question: r.question,
      answer: r.answer,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async add(f: AssistantFactInput, at: Date): Promise<AssistantFact> {
    const [r] = await this.db
      .insert(s.assistantFacts)
      .values({ ...f, createdAt: at })
      .returning();
    if (!r) throw new Error("No se pudo guardar la respuesta");
    return { id: r.id, question: r.question, answer: r.answer, createdAt: r.createdAt.toISOString() };
  }

  async update(id: string, f: AssistantFactInput) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
    const r = await this.db
      .update(s.assistantFacts)
      .set(f)
      .where(eq(s.assistantFacts.id, id))
      .returning({ id: s.assistantFacts.id });
    return r.length > 0;
  }

  async remove(id: string) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
    const r = await this.db
      .delete(s.assistantFacts)
      .where(eq(s.assistantFacts.id, id))
      .returning({ id: s.assistantFacts.id });
    return r.length > 0;
  }
}

const KEY = "assistant";

/** Ajustes de Galú en content_blocks["assistant"]. */
export class DrizzleAssistantSettings implements AssistantSettingsStore {
  constructor(private readonly db: Db) {}

  async get(): Promise<Partial<AssistantSettings>> {
    const [r] = await this.db.select().from(s.contentBlocks).where(eq(s.contentBlocks.key, KEY));
    return (r?.value as Partial<AssistantSettings> | undefined) ?? {};
  }

  async save(value: AssistantSettings) {
    await this.db
      .insert(s.contentBlocks)
      .values({ key: KEY, value })
      .onConflictDoUpdate({ target: s.contentBlocks.key, set: { value } });
  }
}
