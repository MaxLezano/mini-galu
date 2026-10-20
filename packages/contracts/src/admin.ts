import { z } from "zod";
import { MeasuresSchema, OccasionSchema, ProductStatusSchema, ProductSummarySchema, SizeSchema } from "./catalog";

/* ------------------------------------------------------------------ productos (panel del taller) */

export const AdminImageSchema = z.object({ path: z.string().min(1), url: z.string(), alt: z.string() });
export type AdminImage = z.infer<typeof AdminImageSchema>;

export const WaitlistCountSchema = z.object({ size: SizeSchema.nullable(), count: z.number().int() });

export const AdminProductSchema = ProductSummarySchema.extend({
  care: z.string(),
  images: z.array(AdminImageSchema),
  /** Anotadas esperando, por talle (size null = "avisame cuando salga"). */
  waitlist: z.array(WaitlistCountSchema),
  updatedAt: z.string(),
});
export type AdminProduct = z.infer<typeof AdminProductSchema>;

const priceCents = z.number().int().positive("El precio tiene que ser mayor a 0").max(100_000_000);

export const ProductInputSchema = z
  .object({
    name: z.string().trim().min(2, "Poné un nombre").max(80),
    description: z.string().trim().min(1, "Contá cómo es la prenda").max(1000),
    collectionSlug: z.string().min(1, "Elegí una colección"),
    color: z.object({
      name: z.string().trim().min(1, "Poné el color"),
      hex: z.string().regex(/^#[0-9a-f]{6}$/i, "Color inválido"),
    }),
    fabric: z.string().trim().min(1, "Poné la tela").max(120),
    care: z.string().trim().max(500),
    occasions: z.array(OccasionSchema),
    priceCents,
    compareAtCents: priceCents.nullable(),
    tag: z.string().trim().max(24).nullable(),
    isAccessory: z.boolean(),
    status: ProductStatusSchema,
    images: z.array(z.object({ path: z.string().min(1), alt: z.string().max(140) })).max(12, "Hasta 12 fotos"),
    variants: z
      .array(
        z.object({ size: SizeSchema, stock: z.number().int().min(0).max(999), measures: MeasuresSchema.nullable() }),
      )
      .min(1, "Agregá al menos un talle"),
  })
  .superRefine((p, ctx) => {
    if (p.compareAtCents !== null && p.compareAtCents <= p.priceCents)
      ctx.addIssue({
        code: "custom",
        path: ["compareAtCents"],
        message: "El precio anterior tiene que ser mayor al actual",
      });
    const sizes = p.variants.map((v) => v.size);
    if (new Set(sizes).size !== sizes.length)
      ctx.addIssue({ code: "custom", path: ["variants"], message: "Hay talles repetidos" });
    if (p.status === "published" && !p.images.length)
      ctx.addIssue({ code: "custom", path: ["images"], message: "Para publicar, subí al menos una foto" });
  });
export type ProductInput = z.infer<typeof ProductInputSchema>;

export const SaveProductResultSchema = z.object({
  product: AdminProductSchema,
  /** Talles que volvieron a tener stock y cuántas personas los esperan (las avisa la automatización "Volvió un talle"). */
  replenished: z.array(z.object({ size: SizeSchema, waiting: z.number().int() })),
});
export type SaveProductResult = z.infer<typeof SaveProductResultSchema>;

export const StatusInputSchema = z.object({ status: ProductStatusSchema });

export const UploadResultSchema = z.object({ path: z.string(), url: z.string() });
export type UploadResult = z.infer<typeof UploadResultSchema>;

export const ACCEPTED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/* ------------------------------------------------------------------ sesión */
export const AdminSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  /** Verificación en dos pasos activada (obligatoria para el panel en producción). */
  twoFactorEnabled: z.boolean(),
});
export type AdminSession = z.infer<typeof AdminSessionSchema>;

/* ------------------------------------------------------------------ lanzamientos (panel) */
export const LaunchStateSchema = z.enum(["draft", "scheduled", "past"]);
export type LaunchState = z.infer<typeof LaunchStateSchema>;

export const AdminLaunchSchema = z.object({
  id: z.string(),
  title: z.string(),
  /** "Frase corta" que va manuscrita sobre la foto. */
  coverNote: z.string().nullable(),
  /** "Adelanto": qué trae la colección. */
  teaser: z.string(),
  coverPath: z.string().nullable(),
  coverUrl: z.string().nullable(),
  startsAt: z.string(),
  collectionSlug: z.string().nullable(),
  products: z.array(
    z.object({ slug: z.string(), name: z.string(), imageUrl: z.string().nullable(), status: ProductStatusSchema }),
  ),
  showCountdown: z.boolean(),
  notifyBefore: z.boolean(),
  autoPublish: z.boolean(),
  socialText: z.string().nullable(),
  /** draft = borrador · scheduled = programado y por venir · past = ya salió. */
  state: LaunchStateSchema,
  publishedAt: z.string().nullable(),
  signups: z.number().int(),
  /** Veces que guardaron sus prendas en favoritos (con cuenta). */
  favorites: z.number().int(),
  /** Visitas al adelanto antes de salir: la sección de la home o la ficha de sus prendas (una por visitante y día). */
  visits: z.number().int(),
  /** Unidades vendidas en las primeras 24 h (solo los que ya salieron; null si no salió). */
  soldFirstDay: z.number().int().nullable(),
});
export type AdminLaunch = z.infer<typeof AdminLaunchSchema>;

export const LaunchInputSchema = z
  .object({
    title: z.string().trim().min(2, "Ponele un nombre al lanzamiento").max(60),
    coverNote: z.string().trim().max(40).nullable(),
    teaser: z.string().trim().min(1, "Contá qué trae el lanzamiento").max(300),
    coverPath: z.string().min(1).nullable(),
    startsAt: z.iso.datetime({ offset: true, message: "Fecha y hora inválidas" }),
    collectionSlug: z.string().min(1).nullable(),
    productSlugs: z.array(z.string().min(1)).max(40),
    showCountdown: z.boolean(),
    notifyBefore: z.boolean(),
    autoPublish: z.boolean(),
    socialText: z.string().trim().max(2200).nullable(),
    status: z.enum(["draft", "scheduled"]),
  })
  .superRefine((l, ctx) => {
    if (l.status !== "scheduled") return;
    if (!l.productSlugs.length)
      ctx.addIssue({ code: "custom", path: ["productSlugs"], message: "Elegí al menos una prenda que salga" });
    if (!l.coverPath) ctx.addIssue({ code: "custom", path: ["coverPath"], message: "Elegí una foto de portada" });
  });
export type LaunchInput = z.infer<typeof LaunchInputSchema>;
