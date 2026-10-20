/** Datos fijos de la marca. Contacto y taller se editan en Tienda y pagos (`storeInfo` de shell-context). */
export const SITE = {
  name: "Mini Galú",
  /** Dirección pública de la tienda (links absolutos de SEO: sitemap, canonical, Open Graph, JSON-LD). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  description: "Prendas de diseño para niñas, de 12 meses a talle 10. Diseños propios, bordados a mano.",
} as const;
