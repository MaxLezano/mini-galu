import { z } from "zod";
import { CollectionSchema, ContactSchema, RatingSchema } from "./catalog";

export const LaunchSchema = z.object({
  id: z.string(),
  title: z.string(),
  collectionSlug: z.string().nullable(),
  startsAt: z.string(),
  teaser: z.string(),
  coverUrl: z.string().nullable(),
  /** Nota manuscrita sobre la foto: "se viene el frío ♡". */
  coverNote: z.string().nullable(),
  showCountdown: z.boolean(),
  signups: z.number().int(),
});
export type Launch = z.infer<typeof LaunchSchema>;

export const HeroSchema = z.object({
  eyebrow: z.string(),
  /** Líneas del título; *texto* se muestra en itálica (em). */
  titleLines: z.array(z.string()),
  lead: z.string(),
  /** Texto del botón principal ("Ver la colección"). */
  ctaLabel: z.string(),
  imageUrl: z.string(),
  imageAlt: z.string(),
});
export type Hero = z.infer<typeof HeroSchema>;

export const LookbookSpotSchema = z.object({
  imageUrl: z.string(),
  alt: z.string(),
  caption: z.string().nullable(),
  objectPosition: z.string().nullable(),
  productSlug: z.string(),
});
export type LookbookSpot = z.infer<typeof LookbookSpotSchema>;

export const FeaturedReviewSchema = z.object({
  author: z.string(),
  city: z.string().nullable(),
  body: z.string(),
  rating: z.number().int(),
  /** Foto del cliente: si no subió, se ve la de la prenda. */
  photoUrl: z.string().nullable(),
  product: z.object({ slug: z.string(), name: z.string(), imageUrl: z.string().nullable() }),
});
export type FeaturedReview = z.infer<typeof FeaturedReviewSchema>;

export const HomeContentSchema = z.object({
  announcements: z.array(z.string()),
  hero: HeroSchema,
  /** Arcos de "Para cada momento" (la colección del lanzamiento se muestra como "Próximamente"). */
  featuredCollections: z.array(CollectionSchema.extend({ title: z.string() })),
  /** Orden del carrusel "Lo nuevo de la semana". */
  railSlugs: z.array(z.string()),
  launch: LaunchSchema.nullable(),
  lookbook: z.array(LookbookSpotSchema),
  reviews: z.object({ rating: RatingSchema, featured: z.array(FeaturedReviewSchema) }),
  instagram: z.object({ handle: z.string(), url: z.string(), imageUrls: z.array(z.string()) }),
});
export type HomeContent = z.infer<typeof HomeContentSchema>;

/** Lo que se guarda en content_blocks["home"] (lo resuelto —colecciones, reseñas, lanzamiento— lo arma la API). */
export const HomeBlockSchema = z.object({
  announcements: z.array(z.string()),
  hero: z.object({
    eyebrow: z.string(),
    titleLines: z.array(z.string()),
    lead: z.string(),
    ctaLabel: z.string().default("Ver la colección"),
    imagePath: z.string(),
    imageAlt: z.string(),
  }),
  /** title admite *énfasis*: "*Fiestas* y ceremonias". */
  featuredCollections: z.array(z.object({ slug: z.string(), title: z.string() })),
  railSlugs: z.array(z.string()),
  lookbook: z.array(
    z.object({
      imagePath: z.string(),
      alt: z.string(),
      caption: z.string().nullable(),
      objectPosition: z.string().nullable(),
      productSlug: z.string(),
    }),
  ),
  instagram: z.object({ handle: z.string(), url: z.string(), imagePaths: z.array(z.string()) }),
});
export type HomeBlock = z.infer<typeof HomeBlockSchema>;

/** Portada editable desde el panel (mockup admin-tienda.html → "Portada de la tienda"). */
export const HomeHeroInputSchema = z.object({
  hero: z.object({
    eyebrow: z.string().trim().max(40),
    /** Cada línea del título; *palabra* va en itálica. */
    titleLines: z
      .array(z.string().trim().min(1).max(40))
      .min(1, "Poné un título")
      .max(4, "El título va en hasta 4 líneas"),
    lead: z.string().trim().max(220),
    ctaLabel: z.string().trim().min(2, "Poné el texto del botón").max(30),
    imagePath: z.string().min(1, "Elegí una foto"),
    imageAlt: z.string().trim().max(140),
  }),
  announcements: z.array(z.string().trim().min(2).max(80)).min(1, "Dejá al menos un anuncio").max(8),
});
export type HomeHeroInput = z.infer<typeof HomeHeroInputSchema>;

export const AdminHomeSchema = HomeHeroInputSchema.extend({
  heroImageUrl: z.string(),
  /** Fotos para elegir: las de la portada, el lookbook y los lanzamientos. */
  imageOptions: z.array(z.object({ path: z.string(), url: z.string() })),
});
export type AdminHome = z.infer<typeof AdminHomeSchema>;

export const LaunchSignupRequestSchema = ContactSchema;
export type LaunchSignupRequest = z.infer<typeof LaunchSignupRequestSchema>;

/** Alguien vio el adelanto: la sección de la home (por id) o la ficha de una prenda que todavía no salió. */
export const LaunchVisitRequestSchema = z.union([
  z.object({ launchId: z.uuid() }).strict(),
  z.object({ productSlug: z.string().trim().min(1).max(120) }).strict(),
]);
export type LaunchVisitRequest = z.infer<typeof LaunchVisitRequestSchema>;
