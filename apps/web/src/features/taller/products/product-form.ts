import type { AdminProduct, Measures, Occasion, ProductInput, ProductStatus, Size } from "@mini-galu/contracts";
import { formatARS } from "@mini-galu/contracts";

/** Estado editable del editor de productos (strings en los campos de texto, como los escribe Gaby). */
export type ProductForm = {
  name: string;
  description: string;
  collectionSlug: string;
  colorName: string;
  colorHex: string;
  fabric: string;
  care: string;
  occasions: Occasion[];
  price: string;
  compareAt: string;
  tag: string;
  isAccessory: boolean;
  images: { path: string; url: string; alt: string }[];
  variants: { size: Size; stock: number; measures: Measures }[];
};

export const DEFAULT_CARE =
  "Lavar a mano o en ciclo delicado con agua fría, del revés. No usar secarropas. Planchar a temperatura media evitando el bordado.";

/** "$38.000" / "38000" / "38.000,50" → centavos. Vacío o inválido → null. */
export function parsePesos(text: string): number | null {
  const clean = text.replace(/[^\d,]/g, "").replace(",", ".");
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
}

export const pesosText = (cents: number | null) => (cents ? formatARS(cents) : "");

export function emptyForm(collectionSlug: string): ProductForm {
  return {
    name: "",
    description: "",
    collectionSlug,
    colorName: "",
    colorHex: "#CDB79A",
    fabric: "",
    care: DEFAULT_CARE,
    occasions: [],
    price: "",
    compareAt: "",
    tag: "",
    isAccessory: false,
    images: [],
    variants: (["2", "4", "6"] as const).map((size) => ({ size, stock: 0, measures: {} })),
  };
}

export function toForm(p: AdminProduct): ProductForm {
  return {
    name: p.name,
    description: p.description,
    collectionSlug: p.collection.slug,
    colorName: p.color.name,
    colorHex: p.color.hex,
    fabric: p.fabric,
    care: p.care,
    occasions: p.occasions,
    price: pesosText(p.priceCents),
    compareAt: pesosText(p.compareAtCents),
    tag: p.tag ?? "",
    isAccessory: p.isAccessory,
    images: p.images,
    variants: p.variants.map((v) => ({ size: v.size, stock: v.stock, measures: v.measures ?? {} })),
  };
}

/** Medidas vacías o en 0 no se guardan. */
function cleanMeasures(m: Measures): Measures | null {
  const out = Object.fromEntries(Object.entries(m).filter(([, v]) => typeof v === "number" && v > 0));
  return Object.keys(out).length ? (out as Measures) : null;
}

/** Arma el input de la API. La validación fina la hace ProductInputSchema (mismo esquema que usa la API). */
export function toInput(f: ProductForm, status: ProductStatus): ProductInput {
  return {
    name: f.name.trim(),
    description: f.description.trim(),
    collectionSlug: f.collectionSlug,
    color: { name: f.colorName.trim(), hex: f.colorHex },
    fabric: f.fabric.trim(),
    care: f.care.trim(),
    occasions: f.occasions,
    priceCents: parsePesos(f.price) ?? 0,
    compareAtCents: parsePesos(f.compareAt),
    tag: f.tag.trim() || null,
    isAccessory: f.isAccessory,
    status,
    images: f.images.map(({ path, alt }) => ({ path, alt: alt || f.name.trim() })),
    variants: f.variants.map((v) => ({ size: v.size, stock: v.stock, measures: cleanMeasures(v.measures) })),
  };
}

/** Talles que pasan de 0 a tener stock y tienen gente esperando (para avisarle a Gaby antes de guardar). */
export function pendingNotices(p: AdminProduct | null, f: ProductForm): { size: Size; waiting: number }[] {
  if (!p) return [];
  return f.variants
    .filter((v) => v.stock > 0 && (p.variants.find((o) => o.size === v.size)?.stock ?? 0) === 0)
    .map((v) => ({ size: v.size, waiting: p.waitlist.find((w) => w.size === v.size)?.count ?? 0 }))
    .filter((x) => x.waiting > 0);
}
