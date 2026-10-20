import type { OrderStatus, ReviewModeration, ReviewStatus } from "@mini-galu/contracts";
import { ValidationError } from "../../shared/domain/errors";

/** Página de la tienda donde se reseñan las prendas de un pedido (link del mail y de Mi cuenta). */
export const reviewPath = (number: string, token: string) => `/resena/${number}?t=${encodeURIComponent(token)}`;

/** Solo se reseña lo que ya llegó. */
export const canReview = (status: OrderStatus) => status === "entregado";

/** "Lucía Fernández" → "Lucía F.": la reseña es pública, nunca el apellido completo. */
export function publicAuthor(firstName: string, lastName: string): string {
  const first = firstName.trim().split(/\s+/)[0] ?? "";
  const initial = lastName.trim().charAt(0).toUpperCase();
  return initial ? `${first} ${initial}.` : first;
}

export type Moderated = { status: ReviewStatus; featured: boolean };

/**
 * Lo que decide Gaby en el panel. Solo se destaca (cinta de la home) una publicada; si deja de estar publicada,
 * sale también de la home.
 */
export function moderate(current: Moderated, m: ReviewModeration): Moderated {
  const status = m.status ?? current.status;
  const featured = m.featured ?? current.featured;
  if (m.featured && status !== "publicada") throw new ValidationError("Para mostrarla en el inicio, primero publicala");
  return { status, featured: status === "publicada" && featured };
}
