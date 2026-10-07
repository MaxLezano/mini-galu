import type { Size } from "@mini-galu/contracts";
import { and, type Db, eq, inArray, schema as s, sql } from "@mini-galu/db";
import type { CartOwner, CartRepository, VariantCatalog, VariantInfo } from "../application/ports";
import type { CartItem } from "../domain/cart";

const ownerWhere = (o: CartOwner) => ("userId" in o ? eq(s.carts.userId, o.userId) : eq(s.carts.token, o.token));

export class DrizzleCartRepository implements CartRepository {
  constructor(private readonly db: Db) {}

  async findId(owner: CartOwner) {
    const [r] = await this.db.select({ id: s.carts.id }).from(s.carts).where(ownerWhere(owner));
    return r?.id ?? null;
  }

  async create(owner: CartOwner) {
    const [r] = await this.db
      .insert(s.carts)
      .values("userId" in owner ? { userId: owner.userId } : { token: owner.token })
      .onConflictDoNothing()
      .returning({ id: s.carts.id });
    return r?.id ?? ((await this.findId(owner)) as string);
  }

  async items(cartId: string): Promise<CartItem[]> {
    return this.db
      .select({ variantId: s.cartItems.variantId, qty: s.cartItems.qty })
      .from(s.cartItems)
      .where(eq(s.cartItems.cartId, cartId))
      .orderBy(s.cartItems.addedAt);
  }

  async setQty(cartId: string, variantId: string, qty: number) {
    if (qty <= 0) {
      await this.db
        .delete(s.cartItems)
        .where(and(eq(s.cartItems.cartId, cartId), eq(s.cartItems.variantId, variantId)));
    } else {
      await this.db
        .insert(s.cartItems)
        .values({ cartId, variantId, qty })
        .onConflictDoUpdate({ target: [s.cartItems.cartId, s.cartItems.variantId], set: { qty } });
    }
    await this.touch(cartId);
  }

  async replace(cartId: string, items: CartItem[]) {
    await this.db.transaction(async (tx) => {
      const before = await tx
        .select({ variantId: s.cartItems.variantId, addedAt: s.cartItems.addedAt })
        .from(s.cartItems)
        .where(eq(s.cartItems.cartId, cartId));
      const added = new Map(before.map((b) => [b.variantId, b.addedAt]));
      await tx.delete(s.cartItems).where(eq(s.cartItems.cartId, cartId));
      if (items.length)
        await tx
          .insert(s.cartItems)
          .values(items.map((i) => ({ cartId, ...i, addedAt: added.get(i.variantId) ?? new Date() })));
    });
    await this.touch(cartId);
  }

  async delete(cartId: string) {
    await this.db.delete(s.carts).where(eq(s.carts.id, cartId));
  }

  private touch(cartId: string) {
    return this.db.update(s.carts).set({ updatedAt: new Date() }).where(eq(s.carts.id, cartId));
  }
}

/** La bolsa lee del catálogo: nombre, precio, foto de portada, stock y si está publicada. */
export class DrizzleVariantCatalog implements VariantCatalog {
  constructor(private readonly db: Db) {}

  async find(slug: string, size: Size) {
    return (await this.load(and(eq(s.products.slug, slug), eq(s.variants.size, size))))[0] ?? null;
  }

  async byIds(ids: string[]) {
    return ids.length ? this.load(inArray(s.variants.id, ids)) : [];
  }

  private async load(where: ReturnType<typeof and>): Promise<VariantInfo[]> {
    const cover = sql<string | null>`(
      select ${s.productImages.path} from ${s.productImages}
      where ${s.productImages.productId} = ${s.products.id}
      order by ${s.productImages.position} limit 1)`;
    const rows = await this.db
      .select({
        variantId: s.variants.id,
        slug: s.products.slug,
        size: s.variants.size,
        name: s.products.name,
        colorName: s.products.colorName,
        priceCents: s.products.priceCents,
        imagePath: cover,
        stock: s.variants.stock,
        status: s.products.status,
      })
      .from(s.variants)
      .innerJoin(s.products, eq(s.products.id, s.variants.productId))
      .where(where);
    return rows.map(({ status, ...r }) => ({ ...r, size: r.size as Size, published: status === "published" }));
  }
}
