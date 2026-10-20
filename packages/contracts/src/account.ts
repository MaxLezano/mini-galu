import { z } from "zod";
import { SizeSchema } from "./catalog";
import type { AccountGiftcard } from "./giftcards";

/* ------------------------------------------------------------------ contraseña */
export const PASSWORD_RULES = [
  { test: (s: string) => s.length >= 8, message: "Al menos 8 caracteres" },
  { test: (s: string) => /[a-z]/.test(s), message: "Una minúscula" },
  { test: (s: string) => /[A-Z]/.test(s), message: "Una mayúscula" },
  { test: (s: string) => /\d/.test(s), message: "Un número" },
  { test: (s: string) => /[^A-Za-z0-9\s]/.test(s), message: "Un carácter especial (ej. . ! # @)" },
] as const;

/** Mínimo 8 caracteres con mayúscula, minúscula, número y carácter especial. Se valida en la web y en la API. */
export const PasswordSchema = z
  .string()
  .max(128, "Máximo 128 caracteres")
  .superRefine((s, ctx) => {
    const missing = PASSWORD_RULES.filter((r) => !r.test(s)).map((r) => r.message.toLowerCase());
    if (missing.length) ctx.addIssue({ code: "custom", message: `La contraseña necesita: ${missing.join(", ")}` });
  });

/* ------------------------------------------------------------------ datos personales */
const personName = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Poné tu ${label}`)
    .max(60)
    .regex(/^[\p{L}][\p{L}\s'.-]*$/u, `El ${label} solo lleva letras`);

export const FirstNameSchema = personName("nombre");
export const LastNameSchema = personName("apellido");

/** Teléfono en formato internacional E.164: "+" + código de país + número (sin espacios). Ej. +5491155551234 */
export const PhoneSchema = z.object({
  /** País elegido en el selector (ISO 3166-1 alfa-2): AR, US, UY… */
  country: z.string().regex(/^[A-Z]{2}$/, "País inválido"),
  number: z.string().regex(/^\+[1-9]\d{6,14}$/, "Teléfono inválido"),
});
export type Phone = z.infer<typeof PhoneSchema>;

export const DOCUMENT_TYPES = { DNI: "DNI", CUIT: "CUIT", CUIL: "CUIL", PAS: "Pasaporte" } as const;
export type DocumentType = keyof typeof DOCUMENT_TYPES;
export const DocumentSchema = z
  .object({
    type: z.enum(Object.keys(DOCUMENT_TYPES) as [DocumentType, ...DocumentType[]]),
    number: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{6,15}$/i, "Número de documento inválido"),
  })
  .superRefine((d, ctx) => {
    if (d.type === "DNI" && !/^\d{7,8}$/.test(d.number))
      ctx.addIssue({ code: "custom", path: ["number"], message: "El DNI son 7 u 8 números, sin puntos" });
    if ((d.type === "CUIT" || d.type === "CUIL") && !/^\d{11}$/.test(d.number))
      ctx.addIssue({ code: "custom", path: ["number"], message: "El CUIT/CUIL son 11 números, sin guiones" });
  });

/* ------------------------------------------------------------------ direcciones */
export const AddressInputSchema = z.object({
  /** Cómo la llama la clienta: "Casa", "Lo de la abuela". */
  label: z.string().trim().max(40).default("Casa"),
  street: z.string().trim().min(2, "Poné la calle").max(120),
  number: z.string().trim().min(1, "Poné la altura").max(10),
  /** Piso / depto (opcional). */
  unit: z.string().trim().max(20).nullable().default(null),
  city: z.string().trim().min(2, "Poné la localidad").max(80),
  province: z.string().trim().min(2, "Poné la provincia").max(60),
  postalCode: z
    .string()
    .trim()
    .regex(/^[A-Z]?\d{4}[A-Z]{0,3}$/i, "Código postal inválido"),
  country: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .default("AR"),
  /** Observaciones para quien entrega: "casa blanca con portón negro en la esquina". */
  notes: z.string().trim().max(300).nullable().default(null),
  isDefault: z.boolean().default(false),
});
export type AddressInput = z.input<typeof AddressInputSchema>;

/* ------------------------------------------------------------------ "Mis nenas" */
export const ChildInputSchema = z.object({
  name: z.string().trim().min(1, "Poné su nombre").max(40),
  /** Para avisar del cumple y calcular la edad (y con ella el talle). */
  birthday: z.iso.date().nullable(),
  size: SizeSchema.nullable(),
  heightCm: z.number().int().min(40).max(180).nullable(),
});
export type ChildInput = z.infer<typeof ChildInputSchema>;

/* ------------------------------------------------------------------ cuenta de la tienda (ingresar.html, cuenta.html) */

export const SignUpInputSchema = z.object({
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  email: z.string().trim().toLowerCase().max(120).pipe(z.email("Revisá el email")),
  password: PasswordSchema,
  newsletter: z.boolean(),
});
export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export const ProfileUpdateSchema = z.object({
  firstName: FirstNameSchema,
  lastName: LastNameSchema,
  /** Celular en E.164 (+5491155551234) o null. */
  phone: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Teléfono inválido")
    .nullable(),
  newsletterOptIn: z.boolean(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

export type AccountProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean;
  phone: string | null;
  newsletterOptIn: boolean;
  /** Para "Cliente desde mayo 2026". */
  createdAt: string;
};

export type AccountWishItem = {
  id: string;
  slug: string;
  name: string;
  size: string;
  priceCents: number;
  imageUrl: string;
  gifted: boolean;
  /** Quién la regaló: se muestra recién después del cumple. */
  giftedBy: string | null;
};

export type AccountChild = {
  id: string;
  name: string;
  birthday: string | null;
  size: string | null;
  heightCm: number | null;
  /** Link público de la lista de cumple (/lista/{wishSlug}). */
  wishSlug: string;
  wishlist: AccountWishItem[];
};

export const WishAddSchema = z.object({ slug: z.string().min(1).max(120), size: z.string().min(1).max(10) });
/** Modo lista del catálogo: varias prendas elegidas de una vez. */
export const WishAddManySchema = z.object({ items: z.array(WishAddSchema).min(1).max(40) });

/** La lista de cumple que ve la familia (sin cuenta): sin quién regaló qué. */
export type PublicWishlist = {
  name: string;
  /** "2021-11-14" */
  birthday: string | null;
  items: (Omit<AccountWishItem, "giftedBy"> & { inStock: boolean })[];
};

export type AccountAddress = {
  id: string;
  label: string;
  street: string;
  number: string;
  unit: string | null;
  city: string;
  province: string;
  postalCode: string;
  notes: string | null;
  isDefault: boolean;
};

export type AccountOrder = {
  number: string;
  status: string;
  createdAt: string;
  totalCents: number;
  items: { slug: string; name: string; size: string; qty: number; imageUrl: string }[];
  /** Entregado: dónde dejar la reseña de sus prendas ("/resena/MG-1035?t=…"). */
  reviewPath: string | null;
};

export type AccountOverview = {
  profile: AccountProfile;
  children: AccountChild[];
  addresses: AccountAddress[];
  orders: AccountOrder[];
  /** Slugs de los favoritos. */
  favorites: string[];
  /** Las que compró o le regalaron (por el mail de la cuenta). */
  giftcards: AccountGiftcard[];
};

export const FavoritesMergeSchema = z.object({ slugs: z.array(z.string().min(1).max(120)).max(200) });
