import { z } from "zod";

/* ------------------------------------------------------------------ talles */
export const SIZES = ["12m", "2", "4", "6", "8", "10", "Único"] as const;
export const SizeSchema = z.enum(SIZES);
export type Size = z.infer<typeof SizeSchema>;
/** Talles de ropa (sin "Único"), en orden, para filtros y calculadora. */
export const GARMENT_SIZES = ["12m", "2", "4", "6", "8", "10"] as const satisfies readonly Size[];

export const sizeLabel = (s: Size) => (s === "12m" ? "12 m" : s);
export const sizeAge = (s: Size) => (s === "12m" ? "12–18 meses" : s === "Único" ? "Todas" : `${s} años`);
export const sizeOrder = (s: Size) => SIZES.indexOf(s);

/* ------------------------------------------------------------------ ocasiones */
export const OCCASIONS = {
  diario: "Día a día",
  cumple: "Cumple",
  fiesta: "Fiesta",
  bautismo: "Bautismo",
  navidad: "Navidad",
  casamiento: "Casamiento",
  comunion: "Comunión",
  regalo: "Regalo",
} as const;
export type Occasion = keyof typeof OCCASIONS;
export const OccasionSchema = z.enum(Object.keys(OCCASIONS) as [Occasion, ...Occasion[]]);
/** Las que se ofrecen como filtro en el catálogo (mockup: catalogo.html). */
export const FILTER_OCCASIONS = [
  "diario",
  "cumple",
  "fiesta",
  "bautismo",
  "navidad",
  "casamiento",
] as const satisfies readonly Occasion[];

/* ------------------------------------------------------------------ producto */
export const ProductStatusSchema = z.enum(["draft", "published"]);
export type ProductStatus = z.infer<typeof ProductStatusSchema>;

export const MeasuresSchema = z.object({
  largo: z.number().int().positive().optional(),
  axila: z.number().int().positive().optional(),
  cintura: z.number().int().positive().optional(),
  ancho: z.number().int().positive().optional(),
});
export type Measures = z.infer<typeof MeasuresSchema>;

export const VariantSchema = z.object({
  size: SizeSchema,
  stock: z.number().int().nonnegative(),
  measures: MeasuresSchema.nullable(),
});
export type Variant = z.infer<typeof VariantSchema>;

export const ImageSchema = z.object({ url: z.string(), alt: z.string() });
export type Image = z.infer<typeof ImageSchema>;

export const CollectionRefSchema = z.object({ slug: z.string(), name: z.string() });
export type CollectionRef = z.infer<typeof CollectionRefSchema>;

export const RatingSchema = z.object({ average: z.number(), count: z.number().int() });
export type Rating = z.infer<typeof RatingSchema>;

export const ProductSummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  collection: CollectionRefSchema,
  color: z.object({ name: z.string(), hex: z.string() }),
  fabric: z.string(),
  occasions: z.array(OccasionSchema),
  priceCents: z.number().int(),
  compareAtCents: z.number().int().nullable(),
  tag: z.string().nullable(),
  isAccessory: z.boolean(),
  status: ProductStatusSchema,
  images: z.array(ImageSchema),
  variants: z.array(VariantSchema),
  unitsSold: z.number().int(),
  rating: RatingSchema,
  createdAt: z.string(),
});
export type ProductSummary = z.infer<typeof ProductSummarySchema>;

export const FitSchema = z.enum(["justo", "grande", "chico"]);
export type Fit = z.infer<typeof FitSchema>;

export const ReviewSchema = z.object({
  author: z.string(),
  city: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  title: z.string(),
  body: z.string(),
  size: SizeSchema.nullable(),
  fit: FitSchema.nullable(),
  /** Foto que subió el cliente. */
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type Review = z.infer<typeof ReviewSchema>;

export const ProductDetailSchema = ProductSummarySchema.extend({
  care: z.string(),
  reviews: z.array(ReviewSchema),
  /** Cantidad de reseñas con 5, 4, 3, 2 y 1 estrellas. */
  ratingDistribution: z.array(z.number().int()).length(5),
  fitJustoPercent: z.number().int().nullable(),
  completeTheLook: z.array(ProductSummarySchema),
});
export type ProductDetail = z.infer<typeof ProductDetailSchema>;

/* ------------------------------------------------------------------ búsqueda / filtros */
export const SORTS = { new: "Más nuevos", asc: "Menor precio", desc: "Mayor precio", pop: "Más vendidos" } as const;
export type Sort = keyof typeof SORTS;
export const SortSchema = z.enum(Object.keys(SORTS) as [Sort, ...Sort[]]);

const csv = <T extends z.ZodType<unknown, string>>(item: T) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => (v === undefined ? [] : Array.isArray(v) ? v : v.split(",")).filter(Boolean))
    .pipe(z.array(item));

export const CatalogQuerySchema = z.object({
  col: z.string().optional(),
  talle: csv(SizeSchema),
  ocasion: csv(OccasionSchema),
  color: csv(z.string()),
  max: z.coerce.number().int().positive().optional(),
  instock: z
    .enum(["0", "1", "true", "false"])
    .optional()
    .transform((v) => v === undefined || v === "1" || v === "true"),
  q: z.string().trim().optional(),
  sort: SortSchema.default("new"),
});
export type CatalogQueryInput = z.input<typeof CatalogQuerySchema>;
export type CatalogQuery = z.output<typeof CatalogQuerySchema>;

export const CollectionSchema = z.object({
  slug: z.string(),
  name: z.string(),
  /** Nombre largo para menús: "Fiestas y ceremonias". */
  label: z.string(),
  tagline: z.string().nullable(),
  coverUrl: z.string().nullable(),
  productCount: z.number().int(),
  launchAt: z.string().nullable(),
});
export type Collection = z.infer<typeof CollectionSchema>;

export const FacetsSchema = z.object({
  collections: z.array(CollectionSchema),
  colors: z.array(z.object({ name: z.string(), hex: z.string() })),
  priceRange: z.object({ minCents: z.number().int(), maxCents: z.number().int() }),
  total: z.number().int(),
});
export type Facets = z.infer<typeof FacetsSchema>;

/* ------------------------------------------------------------------ contacto / lista de espera */
export const ContactChannelSchema = z.enum(["whatsapp", "email"]);
export type ContactChannel = z.infer<typeof ContactChannelSchema>;

const WHATSAPP_RE = /^[\d\s()+-]{8,20}$/;

export const ContactSchema = z
  .object({ channel: ContactChannelSchema, contact: z.string().trim().min(6).max(120) })
  .superRefine((c, ctx) => {
    const ok = c.channel === "email" ? z.email().safeParse(c.contact).success : WHATSAPP_RE.test(c.contact);
    if (!ok)
      ctx.addIssue({
        code: "custom",
        path: ["contact"],
        message: c.channel === "email" ? "Email inválido" : "WhatsApp inválido",
      });
  });
export type Contact = z.infer<typeof ContactSchema>;

export const WaitlistRequestSchema = z.intersection(
  z.object({ slug: z.string().min(1), size: SizeSchema.nullable() }),
  ContactSchema,
);
export type WaitlistRequest = z.infer<typeof WaitlistRequestSchema>;
