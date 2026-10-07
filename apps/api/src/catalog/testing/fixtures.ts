import type { Product } from "../domain/product";

let n = 0;

export function makeProduct(over: Partial<Product> = {}): Product {
  n++;
  return {
    id: `p-${n}`,
    slug: `producto-${n}`,
    name: `Producto ${n}`,
    description: "Lino con bordado a mano.",
    collection: { slug: "verano-2027", name: "Verano 2027" },
    color: { name: "Rojo", hex: "#A3302B" },
    fabric: "Lino",
    care: "Lavar a mano.",
    occasions: ["diario"],
    priceCents: 30_000_00,
    compareAtCents: null,
    tag: null,
    isAccessory: false,
    status: "published",
    images: [{ path: `products/p-${n}.webp`, alt: "" }],
    variants: [{ size: "Único", stock: 5, measures: null }],
    unitsSold: 0,
    rating: { average: 0, count: 0 },
    createdAt: new Date(2026, 0, n),
    updatedAt: new Date(2026, 0, n),
    ...over,
  };
}
