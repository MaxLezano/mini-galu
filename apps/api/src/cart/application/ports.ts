import type { Size } from "@mini-galu/contracts";
import type { CartItem } from "../domain/cart";

/** De quién es la bolsa: una cuenta (userId) o una invitada (token de la cookie). */
export type CartOwner = { userId: string } | { token: string };

export interface CartRepository {
  findId(owner: CartOwner): Promise<string | null>;
  create(owner: CartOwner): Promise<string>;
  items(cartId: string): Promise<CartItem[]>;
  /** qty 0 borra el ítem. */
  setQty(cartId: string, variantId: string, qty: number): Promise<void>;
  replace(cartId: string, items: CartItem[]): Promise<void>;
  delete(cartId: string): Promise<void>;
}

/** Lo que la bolsa necesita saber de cada talle (lo resuelve el catálogo). */
export type VariantInfo = {
  variantId: string;
  slug: string;
  size: Size;
  name: string;
  colorName: string;
  priceCents: number;
  imagePath: string | null;
  stock: number;
  published: boolean;
};

export interface VariantCatalog {
  find(slug: string, size: Size): Promise<VariantInfo | null>;
  byIds(ids: string[]): Promise<VariantInfo[]>;
}

/**
 * Lo que la misma bolsa tiene reservado en pedidos sin pagar (variantId → unidades). Ese stock ya está descontado,
 * pero sigue siendo de esta bolsa: si no se suma, al volver al checkout la bolsa se achicaría sola.
 */
export interface CartReservations {
  heldBy(cartId: string): Promise<Map<string, number>>;
}
