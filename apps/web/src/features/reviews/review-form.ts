import { type Fit, ReviewInputSchema } from "@mini-galu/contracts";

export type ReviewDraft = { rating: number; body: string; fit: Fit | null; photo: File | null };

export const emptyDraft = (): ReviewDraft => ({ rating: 0, body: "", fit: null, photo: null });

/** Cómo le quedó el talle: chips opcionales del form. */
export const FIT_OPTIONS: [Fit, string][] = [
  ["justo", "Justo"],
  ["grande", "Le quedó grande"],
  ["chico", "Le quedó chico"],
];

export const STAR_LABELS = ["", "No me gustó", "Podría ser mejor", "Está bien", "Me gustó", "¡Me encantó!"] as const;

/** El primer problema del borrador (mismas reglas que la API), o null si se puede mandar. */
export function draftError(d: ReviewDraft): string | null {
  const r = ReviewInputSchema.safeParse({ rating: d.rating, body: d.body, fit: d.fit });
  return r.success ? null : (r.error.issues[0]?.message ?? "Revisá la reseña");
}

/** Lo que viaja a la API (multipart: la foto va en el mismo pedido). */
export function draftForm(d: ReviewDraft): FormData {
  const f = new FormData();
  f.set("rating", String(d.rating));
  f.set("body", d.body.trim());
  if (d.fit) f.set("fit", d.fit);
  if (d.photo) f.set("photo", d.photo);
  return f;
}
