import type {
  AccountAddress,
  AccountChild,
  AccountOrder,
  AccountProfile,
  AddressInputSchema,
  ChildInput,
  ProfileUpdate,
} from "@mini-galu/contracts";
import type { z } from "zod";

export type AddressData = z.output<typeof AddressInputSchema>;

/** La cuenta de un cliente: datos, nenas, direcciones y favoritos. */
export interface CustomerRepository {
  profile(userId: string): Promise<AccountProfile | null>;
  updateProfile(userId: string, p: ProfileUpdate): Promise<void>;

  children(userId: string): Promise<AccountChild[]>;
  addChild(userId: string, c: ChildInput): Promise<AccountChild>;
  updateChild(userId: string, id: string, c: ChildInput): Promise<AccountChild | null>;
  deleteChild(userId: string, id: string): Promise<boolean>;

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
}

/** Cartas del taller: el tilde de "Mis datos" suscribe o da de baja. */
export interface NewsletterPort {
  subscribe(email: string, source: string): Promise<void>;
  unsubscribeEmail(email: string): Promise<void>;
}
