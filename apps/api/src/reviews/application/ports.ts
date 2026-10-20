import type { Fit, OrderStatus, ReviewStatus } from "@mini-galu/contracts";
import type { Moderated } from "../domain/review";

export type ReviewOrderItem = {
  id: string;
  /** null si la prenda ya no existe en el catálogo (no se puede reseñar). */
  productId: string | null;
  slug: string;
  name: string;
  size: string;
  imagePath: string | null;
};

/** Un pedido visto desde las reseñas: quién compró, a dónde se mandó y qué prendas trajo. */
export type ReviewOrder = {
  id: string;
  number: string;
  accessToken: string;
  status: OrderStatus;
  firstName: string;
  lastName: string;
  /** Ciudad del envío a domicilio (la reseña la muestra junto al nombre). */
  city: string | null;
  items: ReviewOrderItem[];
};

export type StoredReview = {
  orderItemId: string;
  rating: number;
  body: string;
  photoPath: string | null;
  status: ReviewStatus;
};

export type NewReview = {
  productId: string;
  orderItemId: string;
  author: string;
  city: string | null;
  rating: number;
  body: string;
  size: string;
  fit: Fit | null;
  photoPath: string | null;
};

export type ReviewRow = Moderated & {
  id: string;
  rating: number;
  title: string;
  body: string;
  author: string;
  city: string | null;
  size: string | null;
  fit: Fit | null;
  photoPath: string | null;
  product: { slug: string; name: string; imagePath: string | null };
  orderNumber: string | null;
  createdAt: Date;
};

export interface ReviewRepository {
  /** Por número ("MG-1035"); null si no existe. */
  findOrder(number: string): Promise<ReviewOrder | null>;
  ofItems(orderItemIds: string[]): Promise<StoredReview[]>;
  /** false si esa prenda ya tenía reseña (una por prenda del pedido). */
  add(r: NewReview): Promise<boolean>;
  /** Todas, las más nuevas primero. */
  list(): Promise<ReviewRow[]>;
  find(id: string): Promise<ReviewRow | null>;
  update(id: string, v: Moderated): Promise<void>;
}
