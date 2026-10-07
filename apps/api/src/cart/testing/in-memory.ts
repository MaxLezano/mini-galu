import type { Size } from "@mini-galu/contracts";
import type { CartOwner, CartRepository, VariantCatalog, VariantInfo } from "../application/ports";
import type { CartItem } from "../domain/cart";

const key = (o: CartOwner) => ("userId" in o ? `u:${o.userId}` : `t:${o.token}`);

export class MemoryCarts implements CartRepository {
  owners = new Map<string, string>();
  carts = new Map<string, CartItem[]>();
  async findId(owner: CartOwner) {
    return this.owners.get(key(owner)) ?? null;
  }
  async create(owner: CartOwner) {
    const id = `c${this.carts.size + 1}`;
    this.owners.set(key(owner), id);
    this.carts.set(id, []);
    return id;
  }
  async items(cartId: string) {
    return [...(this.carts.get(cartId) ?? [])];
  }
  async setQty(cartId: string, variantId: string, qty: number) {
    const list = (this.carts.get(cartId) ?? []).filter((i) => i.variantId !== variantId);
    if (qty > 0) list.push({ variantId, qty });
    this.carts.set(cartId, list);
  }
  async replace(cartId: string, items: CartItem[]) {
    this.carts.set(cartId, items);
  }
  async delete(cartId: string) {
    this.carts.delete(cartId);
    for (const [k, v] of this.owners) if (v === cartId) this.owners.delete(k);
  }
}

export const variant = (slug: string, size: Size, stock: number, over: Partial<VariantInfo> = {}): VariantInfo => ({
  variantId: `${slug}-${size}`,
  slug,
  size,
  name: slug,
  colorName: "Crudo",
  priceCents: 38_000_00,
  imagePath: `products/${slug}-1.webp`,
  stock,
  published: true,
  ...over,
});

export class MemoryVariants implements VariantCatalog {
  constructor(public list: VariantInfo[]) {}
  async find(slug: string, size: Size) {
    return this.list.find((v) => v.slug === slug && v.size === size) ?? null;
  }
  async byIds(ids: string[]) {
    return this.list.filter((v) => ids.includes(v.variantId));
  }
  /** Simula una compra/reposición. */
  setStock(variantId: string, stock: number) {
    const v = this.list.find((x) => x.variantId === variantId);
    if (v) v.stock = stock;
  }
}
