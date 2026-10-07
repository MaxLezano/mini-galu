import type { CartItemInput, CartLine, CartView } from "@mini-galu/contracts";
import { ConflictError, NotFoundError } from "../../shared/domain/errors";
import type { ImageStorage } from "../../shared/media/image-storage";
import { type CartItem, mergeItems } from "../domain/cart";
import type { CartOwner, CartRepository, CartReservations, VariantCatalog, VariantInfo } from "./ports";

export type CartSnapshot = {
  cartId: string | null;
  lines: (CartLine & { variantId: string; imagePath: string | null })[];
};

export class CartService {
  constructor(
    private readonly carts: CartRepository,
    private readonly variants: VariantCatalog,
    private readonly storage: ImageStorage,
    private readonly reservations: CartReservations | null = null,
  ) {}

  async view(owner: CartOwner | null): Promise<CartView> {
    return toView(await this.snapshot(owner));
  }

  /**
   * Bolsa con precios y stock de ahora. Lo que se despublicó o se agotó se saca, y si queda menos stock
   * que lo pedido se ajusta la cantidad (y se guarda el ajuste).
   */
  async snapshot(owner: CartOwner | null): Promise<CartSnapshot> {
    const cartId = owner ? await this.carts.findId(owner) : null;
    if (!cartId) return { cartId: null, lines: [] };
    const items = await this.carts.items(cartId);
    const found = await this.withHeld(cartId, await this.variants.byIds(items.map((i) => i.variantId)));
    const info = new Map(found.map((v) => [v.variantId, v]));
    const fixed = items
      .map((i) => {
        const v = info.get(i.variantId);
        return { variantId: i.variantId, qty: v?.published ? Math.min(i.qty, v.stock) : 0 };
      })
      .filter((i) => i.qty > 0);
    if (fixed.length !== items.length || fixed.some((f, k) => f.qty !== items[k]?.qty))
      await this.carts.replace(cartId, fixed);
    return {
      cartId,
      lines: fixed.map((i) => this.line(info.get(i.variantId) as VariantInfo, i.qty)),
    };
  }

  /** Fija la cantidad de un talle (0 lo saca). */
  async set(owner: CartOwner, input: CartItemInput): Promise<CartView> {
    const cartId = await this.ensure(owner);
    const [v] = await this.withHeld(cartId, [await this.variant(input)]);
    if (!v) throw new NotFoundError("Esa prenda ya no está disponible");
    if (input.qty > v.stock) throw noStock(v);
    await this.carts.setQty(cartId, v.variantId, input.qty);
    return this.view(owner);
  }

  /** Suma unidades a lo que ya había. */
  async add(owner: CartOwner, input: CartItemInput): Promise<CartView> {
    const cartId = await this.ensure(owner);
    const [v] = await this.withHeld(cartId, [await this.variant(input)]);
    if (!v) throw new NotFoundError("Esa prenda ya no está disponible");
    const current = (await this.carts.items(cartId)).find((i) => i.variantId === v.variantId)?.qty ?? 0;
    if (current + input.qty > v.stock) throw noStock(v);
    await this.carts.setQty(cartId, v.variantId, current + input.qty);
    return this.view(owner);
  }

  /** Bolsa del navegador → servidor. Lo que no existe o no tiene stock se ignora. */
  async merge(owner: CartOwner, lines: CartItemInput[]): Promise<CartView> {
    const found = (await Promise.all(lines.map((l) => this.variants.find(l.slug, l.size)))).flatMap((v, k) =>
      v?.published ? [{ v, qty: lines[k]?.qty ?? 0 }] : [],
    );
    if (found.length) {
      const cartId = await this.ensure(owner);
      const current = await this.carts.items(cartId);
      const known = [...found.map(({ v }) => v), ...(await this.variants.byIds(current.map((c) => c.variantId)))];
      const stock = new Map((await this.withHeld(cartId, known)).map((v) => [v.variantId, v.stock]));
      const incoming: CartItem[] = found.map(({ v, qty }) => ({ variantId: v.variantId, qty }));
      await this.carts.replace(
        cartId,
        mergeItems(current, incoming, (id) => stock.get(id) ?? 0),
      );
    }
    return this.view(owner);
  }

  /** Al ingresar: la bolsa de invitada se suma a la de la cuenta y desaparece. */
  async adopt(token: string, userId: string): Promise<void> {
    const guestId = await this.carts.findId({ token });
    if (!guestId) return;
    const guest = await this.carts.items(guestId);
    if (guest.length) {
      const userCart = await this.ensure({ userId });
      const current = await this.carts.items(userCart);
      const stock = new Map(
        (await this.withHeld(userCart, await this.variants.byIds([...guest, ...current].map((i) => i.variantId)))).map(
          (v) => [v.variantId, v.published ? v.stock : 0],
        ),
      );
      await this.carts.replace(
        userCart,
        mergeItems(current, guest, (id) => stock.get(id) ?? 0),
      );
    }
    await this.carts.delete(guestId);
  }

  /** Pago aprobado: la bolsa con la que se compró queda vacía. */
  async empty(cartId: string): Promise<void> {
    await this.carts.replace(cartId, []);
  }

  /** Stock que esta bolsa puede usar: el libre más lo que ella misma tiene reservado en un pedido sin pagar. */
  private async withHeld(cartId: string | null, list: VariantInfo[]): Promise<VariantInfo[]> {
    if (!cartId || !this.reservations) return list;
    const held = await this.reservations.heldBy(cartId);
    return list.map((v) => (held.has(v.variantId) ? { ...v, stock: v.stock + (held.get(v.variantId) ?? 0) } : v));
  }

  private async ensure(owner: CartOwner) {
    return (await this.carts.findId(owner)) ?? (await this.carts.create(owner));
  }

  private async variant(input: CartItemInput) {
    const v = await this.variants.find(input.slug, input.size);
    if (!v?.published) throw new NotFoundError("Esa prenda ya no está disponible");
    return v;
  }

  private line(v: VariantInfo, qty: number) {
    return {
      variantId: v.variantId,
      imagePath: v.imagePath,
      slug: v.slug,
      size: v.size,
      qty,
      name: v.name,
      colorName: v.colorName,
      priceCents: v.priceCents,
      imageUrl: v.imagePath ? this.storage.url(v.imagePath) : "",
      maxStock: v.stock,
    };
  }
}

export function toView(s: CartSnapshot): CartView {
  const lines: CartLine[] = s.lines.map(({ variantId: _v, imagePath: _p, ...l }) => l);
  return {
    lines,
    subtotalCents: lines.reduce((a, l) => a + l.priceCents * l.qty, 0),
    count: lines.reduce((a, l) => a + l.qty, 0),
  };
}

const noStock = (v: VariantInfo) =>
  new ConflictError(
    v.stock ? `Tenemos ${v.stock} en talle ${v.size} y ya están en tu bolsa` : `Se agotó el talle ${v.size}`,
    { max: v.stock },
  );
