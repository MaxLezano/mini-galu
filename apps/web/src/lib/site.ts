import { WORKSHOP } from "@mini-galu/contracts";

/** Datos de contacto del taller (mockups: app.js). */
export const SITE = {
  name: "Mini Galú",
  /** Dirección pública de la tienda (links absolutos de SEO: sitemap, canonical, Open Graph, JSON-LD). */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  description: "Prendas de diseño para niñas, de 12 meses a talle 10. Diseños propios, bordados a mano.",
  whatsapp: "https://wa.me/5491100000000",
  instagram: "https://www.instagram.com/minigalumodainfantil/",
  instagramHandle: "@minigalumodainfantil",
  email: "hola@minigalu.com.ar",
  workshop: WORKSHOP.city,
} as const;
