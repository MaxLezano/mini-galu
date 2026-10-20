import { randomBytes } from "node:crypto";
import type { AccountAddress, AccountOrder, ChildInput, ProfileUpdate } from "@mini-galu/contracts";
import { and, type Db, desc, eq, inArray, isNull, or, schema as s } from "@mini-galu/db";
import type { ImageStorage } from "../../shared/media/image-storage";
import type {
  AddressData,
  ChildRecord,
  CustomerOrders,
  CustomerRepository,
  WishItemRecord,
} from "../application/ports";
import { wishSlug } from "../domain/wishlist";

const toAddress = (r: typeof s.addresses.$inferSelect): AccountAddress => ({
  id: r.id,
  label: r.label,
  street: r.street,
  number: r.number,
  unit: r.unit,
  city: r.city,
  province: r.province,
  postalCode: r.postalCode,
  notes: r.notes,
  isDefault: r.isDefault,
});

const toChild = (r: typeof s.children.$inferSelect): ChildRecord => ({
  id: r.id,
  name: r.name,
  birthday: r.birthday,
  size: r.size,
  heightCm: r.heightCm,
  wishSlug: r.wishSlug ?? "",
});

export class DrizzleCustomers implements CustomerRepository {
  constructor(
    private readonly db: Db,
    private readonly storage: ImageStorage,
  ) {}

  async profile(userId: string) {
    const [u] = await this.db.select().from(s.user).where(eq(s.user.id, userId));
    if (!u) return null;
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      emailVerified: u.emailVerified,
      phone: u.phone,
      newsletterOptIn: u.newsletterOptIn,
      createdAt: u.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, p: ProfileUpdate) {
    await this.db
      .update(s.user)
      .set({
        firstName: p.firstName,
        lastName: p.lastName,
        name: `${p.firstName} ${p.lastName}`.trim(),
        phone: p.phone,
        phoneCountry: p.phone ? "AR" : null,
        newsletterOptIn: p.newsletterOptIn,
      })
      .where(eq(s.user.id, userId));
  }

  async children(userId: string) {
    const rows = await this.db
      .select()
      .from(s.children)
      .where(eq(s.children.userId, userId))
      .orderBy(s.children.createdAt);
    // las nenas cargadas antes de las listas de cumple no tenían link: se les arma uno
    for (const r of rows.filter((x) => !x.wishSlug)) {
      r.wishSlug = wishSlug(r.name, randomBytes(3).toString("hex").slice(0, 4));
      await this.db.update(s.children).set({ wishSlug: r.wishSlug }).where(eq(s.children.id, r.id));
    }
    return rows.map(toChild);
  }

  async child(userId: string, id: string) {
    const [r] = await this.db
      .select()
      .from(s.children)
      .where(and(eq(s.children.id, id), eq(s.children.userId, userId)));
    return r ? toChild(r) : null;
  }

  async addChild(userId: string, c: ChildInput, slug: string) {
    const [r] = await this.db
      .insert(s.children)
      .values({ ...c, userId, wishSlug: slug })
      .returning();
    if (!r) throw new Error("No se pudo guardar");
    return toChild(r);
  }

  async updateChild(userId: string, id: string, c: ChildInput) {
    const [r] = await this.db
      .update(s.children)
      .set(c)
      .where(and(eq(s.children.id, id), eq(s.children.userId, userId)))
      .returning();
    return r ? toChild(r) : null;
  }

  async deleteChild(userId: string, id: string) {
    const rows = await this.db
      .delete(s.children)
      .where(and(eq(s.children.id, id), eq(s.children.userId, userId)))
      .returning({ id: s.children.id });
    return rows.length > 0;
  }

  async wishItems(childIds: string[]): Promise<WishItemRecord[]> {
    if (!childIds.length) return [];
    const rows = await this.db
      .select({
        id: s.wishItems.id,
        childId: s.wishItems.childId,
        productId: s.products.id,
        slug: s.products.slug,
        name: s.products.name,
        size: s.wishItems.size,
        priceCents: s.products.priceCents,
        giftedBy: s.wishItems.giftedBy,
        giftedAt: s.wishItems.giftedAt,
      })
      .from(s.wishItems)
      .innerJoin(s.products, eq(s.products.id, s.wishItems.productId))
      .where(inArray(s.wishItems.childId, childIds))
      .orderBy(s.wishItems.createdAt);
    if (!rows.length) return [];
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const [images, stock] = await Promise.all([
      this.db
        .select({
          productId: s.productImages.productId,
          path: s.productImages.path,
          position: s.productImages.position,
        })
        .from(s.productImages)
        .where(inArray(s.productImages.productId, productIds)),
      this.db
        .select({ productId: s.variants.productId, size: s.variants.size, stock: s.variants.stock })
        .from(s.variants)
        .where(inArray(s.variants.productId, productIds)),
    ]);
    return rows.map(({ productId, ...r }) => {
      const img = images.filter((i) => i.productId === productId).sort((a, b) => a.position - b.position)[0];
      return {
        ...r,
        imageUrl: img ? this.storage.url(img.path) : "",
        inStock: stock.some((v) => v.productId === productId && v.size === r.size && v.stock > 0),
      };
    });
  }

  async addWish(childId: string, slug: string, size: string) {
    const [p] = await this.db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug));
    if (!p) return false;
    await this.db.insert(s.wishItems).values({ childId, productId: p.id, size }).onConflictDoNothing();
    return true;
  }

  async removeWish(childId: string, itemId: string) {
    const rows = await this.db
      .delete(s.wishItems)
      .where(and(eq(s.wishItems.id, itemId), eq(s.wishItems.childId, childId)))
      .returning({ id: s.wishItems.id });
    return rows.length > 0;
  }

  async childBySlug(slug: string) {
    const [r] = await this.db.select().from(s.children).where(eq(s.children.wishSlug, slug));
    return r ? toChild(r) : null;
  }

  async markGifted(itemIds: string[], by: string, at: Date) {
    if (!itemIds.length) return 0;
    const rows = await this.db
      .update(s.wishItems)
      .set({ giftedBy: by, giftedAt: at })
      .where(and(inArray(s.wishItems.id, itemIds), isNull(s.wishItems.giftedAt)))
      .returning({ id: s.wishItems.id });
    return rows.length;
  }

  async addresses(userId: string) {
    return (
      await this.db
        .select()
        .from(s.addresses)
        .where(eq(s.addresses.userId, userId))
        .orderBy(desc(s.addresses.isDefault), s.addresses.createdAt)
    ).map(toAddress);
  }

  async addAddress(userId: string, a: AddressData) {
    return this.db.transaction(async (tx) => {
      if (a.isDefault) await tx.update(s.addresses).set({ isDefault: false }).where(eq(s.addresses.userId, userId));
      const [r] = await tx
        .insert(s.addresses)
        .values({ ...a, userId })
        .returning();
      if (!r) throw new Error("No se pudo guardar");
      return toAddress(r);
    });
  }

  async updateAddress(userId: string, id: string, a: AddressData) {
    return this.db.transaction(async (tx) => {
      if (a.isDefault) await tx.update(s.addresses).set({ isDefault: false }).where(eq(s.addresses.userId, userId));
      const [r] = await tx
        .update(s.addresses)
        .set(a)
        .where(and(eq(s.addresses.id, id), eq(s.addresses.userId, userId)))
        .returning();
      return r ? toAddress(r) : null;
    });
  }

  async deleteAddress(userId: string, id: string) {
    const rows = await this.db
      .delete(s.addresses)
      .where(and(eq(s.addresses.id, id), eq(s.addresses.userId, userId)))
      .returning({ id: s.addresses.id });
    return rows.length > 0;
  }

  async favorites(userId: string) {
    const rows = await this.db
      .select({ slug: s.products.slug })
      .from(s.favorites)
      .innerJoin(s.products, eq(s.products.id, s.favorites.productId))
      .where(eq(s.favorites.userId, userId))
      .orderBy(s.favorites.createdAt);
    return rows.map((r) => r.slug);
  }

  async setFavorite(userId: string, slug: string, on: boolean) {
    const [p] = await this.db.select({ id: s.products.id }).from(s.products).where(eq(s.products.slug, slug));
    if (!p) return false;
    if (on) await this.db.insert(s.favorites).values({ userId, productId: p.id }).onConflictDoNothing();
    else await this.db.delete(s.favorites).where(and(eq(s.favorites.userId, userId), eq(s.favorites.productId, p.id)));
    return true;
  }
}

/** Pedidos de la cuenta: los suyos y los que hizo con el mismo mail sin ingresar (sin los checkouts abandonados). */
export class DrizzleCustomerOrders implements CustomerOrders {
  constructor(
    private readonly db: Db,
    private readonly storage: ImageStorage,
    private readonly formatNumber: (n: number) => string,
    /** Dónde reseña las prendas de un pedido entregado. */
    private readonly reviewPath: (number: string, token: string) => string,
  ) {}

  async wishGift(orderId: string) {
    const [o] = await this.db
      .select({ ids: s.orders.wishItemIds, firstName: s.orders.firstName })
      .from(s.orders)
      .where(eq(s.orders.id, orderId));
    return o ? { itemIds: o.ids ?? [], firstName: o.firstName } : null;
  }

  async ofCustomer(userId: string, email: string | null): Promise<AccountOrder[]> {
    const rows = await this.db
      .select()
      .from(s.orders)
      .where(
        and(
          email
            ? or(eq(s.orders.userId, userId), eq(s.orders.email, email.toLowerCase()))
            : eq(s.orders.userId, userId),
          inArray(s.orders.status, ["nuevo", "preparando", "listo", "en_camino", "entregado", "reembolsado"]),
        ),
      )
      .orderBy(desc(s.orders.createdAt))
      .limit(50);
    if (!rows.length) return [];
    const items = await this.db
      .select()
      .from(s.orderItems)
      .where(
        inArray(
          s.orderItems.orderId,
          rows.map((r) => r.id),
        ),
      );
    return rows.map((o) => ({
      number: this.formatNumber(o.number),
      status: o.status,
      reviewPath: o.status === "entregado" ? this.reviewPath(this.formatNumber(o.number), o.accessToken) : null,
      createdAt: o.createdAt.toISOString(),
      totalCents: o.totalCents,
      items: items
        .filter((i) => i.orderId === o.id)
        .map((i) => ({
          slug: i.productSlug,
          name: i.name,
          size: i.size,
          qty: i.qty,
          imageUrl: i.imagePath ? this.storage.url(i.imagePath) : "",
        })),
    }));
  }
}
