import { z } from "zod";
import { FitSchema } from "./catalog";

/* ------------------------------------------------------------------ el cliente deja su reseña (/resena/MG-1035) */

/** Lo que completa el cliente por cada prenda de un pedido entregado (la foto viaja aparte, en el mismo form). */
export const ReviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1, "Elegí las estrellas").max(5),
  body: z.string().trim().min(10, "Contanos un poquito más (10 letras como mínimo)").max(800, "Máximo 800 caracteres"),
  /** Cómo le quedó el talle (opcional). */
  fit: FitSchema.nullable().default(null),
});
export type ReviewInput = z.input<typeof ReviewInputSchema>;

export const REVIEW_STATUSES = { pendiente: "Para revisar", publicada: "Publicadas", oculta: "Ocultas" } as const;
export type ReviewStatus = keyof typeof REVIEW_STATUSES;
export const ReviewStatusSchema = z.enum(Object.keys(REVIEW_STATUSES) as [ReviewStatus, ...ReviewStatus[]]);

/** La reseña que ya dejó (se muestra en lugar del form). */
export type SubmittedReview = {
  rating: number;
  body: string;
  photoUrl: string | null;
  /** "pendiente" se le muestra como "la estamos leyendo"; "oculta" también, para no avisarle que no salió. */
  published: boolean;
};

export type ReviewableItem = {
  id: string;
  slug: string;
  name: string;
  size: string;
  imageUrl: string;
  review: SubmittedReview | null;
};

export type ReviewableOrder = {
  number: string;
  firstName: string;
  /** Cómo firma la reseña: "Lucía F." */
  author: string;
  /** Solo los pedidos entregados se pueden reseñar. */
  delivered: boolean;
  items: ReviewableItem[];
};

/* ------------------------------------------------------------------ panel: /taller/resenas */

export type AdminReview = {
  id: string;
  status: ReviewStatus;
  featured: boolean;
  rating: number;
  title: string;
  body: string;
  author: string;
  city: string | null;
  size: string | null;
  fit: z.infer<typeof FitSchema> | null;
  photoUrl: string | null;
  product: { slug: string; name: string; imageUrl: string | null };
  /** Pedido del que salió (las del seed no tienen). */
  orderNumber: string | null;
  createdAt: string;
};

export const ReviewModerationSchema = z
  .object({ status: ReviewStatusSchema.optional(), featured: z.boolean().optional() })
  .refine((m) => m.status !== undefined || m.featured !== undefined, "Nada para cambiar");
export type ReviewModeration = z.infer<typeof ReviewModerationSchema>;
