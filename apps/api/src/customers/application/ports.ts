import type {
  AccountAddress,
  AccountOrder,
  AccountProfile,
  AddressInputSchema,
  ChildInput,
  ProfileUpdate,
} from "@mini-galu/contracts";
import type { z } from "zod";

export type AddressData = z.output<typeof AddressInputSchema>;

export type ChildRecord = {
  id: string;
  name: string;
  birthday: string | null;
  size: string | null;
  heightCm: number | null;
  wishSlug: string;
};

export type WishItemRecord = {
  id: string;
  childId: string;
  slug: string;
  name: string;
  size: string;
  priceCents: number;
  imageUrl: string;
  inStock: boolean;
  giftedBy: string | null;
  giftedAt: Date | null;
};

/** La cuenta de un cliente: datos, nenas (con su lista de cumple), direcciones y favoritos. */
export interface CustomerRepository {
  profile(userId: string): Promise<AccountProfile | null>;
  updateProfile(userId: string, p: ProfileUpdate): Promise<void>;

  children(userId: string): Promise<ChildRecord[]>;
  child(userId: string, id: string): Promise<ChildRecord | null>;
  addChild(userId: string, c: ChildInput, wishSlug: string): Promise<ChildRecord>;
  updateChild(userId: string, id: string, c: ChildInput): Promise<ChildRecord | null>;
  deleteChild(userId: string, id: string): Promise<boolean>;

  wishItems(childIds: string[]): Promise<WishItemRecord[]>;
  /** false si la prenda no existe; si ya estaba en la lista, no la repite. */
  addWish(childId: string, slug: string, size: string): Promise<boolean>;
  removeWish(childId: string, itemId: string): Promise<boolean>;
  childBySlug(wishSlug: string): Promise<ChildRecord | null>;
  /** Marca como regaladas las que todavía no lo estaban. */
  markGifted(itemIds: string[], by: string, at: Date): Promise<number>;

  addresses(userId: string): Promise<AccountAddress[]>;
  /** Si es predeterminada, la anterior deja de serlo (en la misma transacción). */
  addAddress(userId: string, a: AddressData): Promise<AccountAddress>;
  updateAddress(userId: string, id: string, a: AddressData): Promise<AccountAddress | null>;
  deleteAddress(userId: string, id: string): Promise<boolean>;

  favorites(userId: string): Promise<string[]>;
  setFavorite(userId: string, slug: string, on: boolean): Promise<boolean>;
}

/** Los pedidos del cliente (por cuenta o por el mismo mail, aunque los haya hecho sin ingresar). */
export interface CustomerOrders {
  ofCustomer(userId: string, email: string): Promise<AccountOrder[]>;
  /** Las prendas de lista de cumple que se regalaron con un pedido, y quién lo hizo. */
  wishGift(orderId: string): Promise<{ itemIds: string[]; firstName: string } | null>;
}

/** Cartas del taller: el tilde de "Mis datos" suscribe o da de baja. */
export interface NewsletterPort {
  subscribe(email: string, source: string): Promise<void>;
  unsubscribeEmail(email: string): Promise<void>;
}
