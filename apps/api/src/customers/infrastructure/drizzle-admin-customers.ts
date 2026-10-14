import type { AdminCustomerOrder } from "@mini-galu/contracts";
import { and, asc, type Db, desc, eq, inArray, isNotNull, ne, or, schema as s, sql } from "@mini-galu/db";
import type { ImageStorage } from "../../shared/media/image-storage";
import type { AdminCustomerRepository } from "../application/ports";
import type { CustomerAccountFact, CustomerOrderFact } from "../domain/customer-list";

const email = sql<string>`lower(${s.orders.email})`;

/** Clientes del panel sobre Postgres: hechos de pedidos y cuentas, pedidos de un mail y notas del taller. */
export class DrizzleAdminCustomers implements AdminCustomerRepository {
  constructor(
    private readonly db: Db,
    private readonly storage: ImageStorage,
    private readonly formatNumber: (n: number) => string,
  ) {}

  async orderFacts(): Promise<CustomerOrderFact[]> {
    const rows = await this.db
      .select({
        email,
        firstName: s.orders.firstName,
        lastName: s.orders.lastName,
        phone: s.orders.phone,
        address: s.orders.shippingAddress,
        province: s.orders.province,
        createdAt: s.orders.createdAt,
        paidAt: s.orders.paidAt,
        status: s.orders.status,
        totalCents: s.orders.totalCents,
      })
      .from(s.orders)
      // un checkout web que nunca se pagó no es un cliente (sí un link de pago armado por el taller)
      .where(or(isNotNull(s.orders.paidAt), ne(s.orders.channel, "web")));
    return rows.map((r) => ({
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      phone: r.phone,
      city: r.address?.city ?? r.province ?? null,
      createdAt: r.createdAt,
      paid: !!r.paidAt && r.status !== "cancelado" && r.status !== "reembolsado",
      totalCents: r.totalCents,
    }));
  }

  async accountFacts(): Promise<CustomerAccountFact[]> {
    const users = await this.db
      .select({
        id: s.user.id,
        email: s.user.email,
        firstName: s.user.firstName,
        lastName: s.user.lastName,
        phone: s.user.phone,
        createdAt: s.user.createdAt,
      })
      .from(s.user)
      .where(eq(s.user.role, "customer"));
    if (!users.length) return [];
    const kids = await this.db
      .select({
        userId: s.children.userId,
        name: s.children.name,
        size: s.children.size,
        birthday: s.children.birthday,
      })
      .from(s.children)
      .where(
        inArray(
          s.children.userId,
          users.map((u) => u.id),
        ),
      )
      .orderBy(asc(s.children.createdAt));
    return users.map((u) => ({
      email: u.email.toLowerCase(),
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      createdAt: u.createdAt,
      children: kids.filter((k) => k.userId === u.id).map(({ userId: _u, ...k }) => k),
    }));
  }

  async ordersOf(mail: string): Promise<AdminCustomerOrder[]> {
    const rows = await this.db
      .select()
      .from(s.orders)
      .where(and(eq(email, mail), or(isNotNull(s.orders.paidAt), ne(s.orders.channel, "web"))))
      .orderBy(desc(s.orders.createdAt))
      .limit(50);
    if (!rows.length) return [];
    const items = await this.db
      .select({ orderId: s.orderItems.orderId, imagePath: s.orderItems.imagePath })
      .from(s.orderItems)
      .where(
        inArray(
          s.orderItems.orderId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((o) => ({
      number: this.formatNumber(o.number),
      createdAt: o.createdAt.toISOString(),
      totalCents: o.totalCents,
      status: o.status,
      thumbs: items
        .filter((i) => i.orderId === o.id && i.imagePath)
        .slice(0, 4)
        .map((i) => this.storage.url(i.imagePath as string)),
    }));
  }

  async collectionsOf(mail: string): Promise<string[]> {
    const rows = await this.db
      .select({ name: s.collections.name, n: sql<number>`sum(${s.orderItems.qty})::int` })
      .from(s.orderItems)
      .innerJoin(s.orders, eq(s.orders.id, s.orderItems.orderId))
      .innerJoin(s.products, eq(s.products.slug, s.orderItems.productSlug))
      .innerJoin(s.collections, eq(s.collections.id, s.products.collectionId))
      .where(and(eq(email, mail), isNotNull(s.orders.paidAt)))
      .groupBy(s.collections.name)
      .orderBy(desc(sql`sum(${s.orderItems.qty})`))
      .limit(3);
    return rows.map((r) => r.name);
  }

  async note(mail: string): Promise<string> {
    const [row] = await this.db.select().from(s.customerNotes).where(eq(s.customerNotes.email, mail));
    return row?.note ?? "";
  }

  async setNote(mail: string, note: string): Promise<void> {
    if (!note) {
      await this.db.delete(s.customerNotes).where(eq(s.customerNotes.email, mail));
      return;
    }
    await this.db
      .insert(s.customerNotes)
      .values({ email: mail, note })
      .onConflictDoUpdate({ target: s.customerNotes.email, set: { note, updatedAt: new Date() } });
  }
}
