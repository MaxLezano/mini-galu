import { type Db, eq, schema as s } from "@mini-galu/db";
import type { KnownPerson, SubscribersReadModel } from "../application/ports";

export class DrizzleSubscribersReadModel implements SubscribersReadModel {
  constructor(private readonly db: Db) {}

  letterSubscribers() {
    return this.db
      .select({
        id: s.newsletterSubscribers.id,
        email: s.newsletterSubscribers.email,
        source: s.newsletterSubscribers.source,
        createdAt: s.newsletterSubscribers.createdAt,
        unsubscribedAt: s.newsletterSubscribers.unsubscribedAt,
      })
      .from(s.newsletterSubscribers);
  }

  async launchSignups() {
    const rows = await this.db
      .select({
        id: s.launchSignups.id,
        channel: s.launchSignups.channel,
        contact: s.launchSignups.contact,
        notifiedAt: s.launchSignups.notifiedAt,
        createdAt: s.launchSignups.createdAt,
        launchId: s.launches.id,
        title: s.launches.title,
        startsAt: s.launches.startsAt,
      })
      .from(s.launchSignups)
      .innerJoin(s.launches, eq(s.launches.id, s.launchSignups.launchId));
    return rows.map(({ launchId, title, startsAt, ...r }) => ({ ...r, launch: { id: launchId, title, startsAt } }));
  }

  async sizeAlerts() {
    const rows = await this.db
      .select({
        id: s.waitlistEntries.id,
        size: s.waitlistEntries.size,
        channel: s.waitlistEntries.channel,
        contact: s.waitlistEntries.contact,
        notifiedAt: s.waitlistEntries.notifiedAt,
        createdAt: s.waitlistEntries.createdAt,
        productId: s.products.id,
        name: s.products.name,
        slug: s.products.slug,
      })
      .from(s.waitlistEntries)
      .innerJoin(s.products, eq(s.products.id, s.waitlistEntries.productId));
    return rows.map(({ productId, name, slug, ...r }) => ({ ...r, product: { id: productId, name, slug } }));
  }

  async knownPeople(): Promise<KnownPerson[]> {
    const [users, orders] = await Promise.all([
      this.db
        .select({ email: s.user.email, phone: s.user.phone, name: s.user.name, at: s.user.createdAt })
        .from(s.user),
      this.db
        .select({
          email: s.orders.email,
          phone: s.orders.phone,
          firstName: s.orders.firstName,
          lastName: s.orders.lastName,
          at: s.orders.createdAt,
        })
        .from(s.orders),
    ]);
    return [
      ...users,
      ...orders.map((o) => ({ email: o.email, phone: o.phone, name: `${o.firstName} ${o.lastName}`, at: o.at })),
    ];
  }
}
