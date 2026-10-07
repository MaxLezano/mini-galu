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

export const LaunchSignupRequestSchema = ContactSchema;
export type LaunchSignupRequest = z.infer<typeof LaunchSignupRequestSchema>;
