import type { HomeBlock } from "@mini-galu/contracts";

/**
 * Portada de base: la que rige mientras Gaby no guardó la suya (una base nueva en producción, sin seed). Sin fotos ni
 * prendas elegidas: la tienda muestra el texto y oculta lo que está vacío hasta que se cargue desde el panel.
 */
export const DEFAULT_HOME: HomeBlock = {
  announcements: [
    "Envíos a todo el país con Andreani",
    "Pagás en cuotas con Mercado Pago",
    "Diseños propios, bordados a mano",
    "Talles 12 meses a 10 años",
  ],
  hero: {
    eyebrow: "Mini Galú",
    titleLines: ["Hecho a mano,", "para *crecer*", "*soñando.*"],
    lead: "Prendas de diseño para niñas de 12 meses a talle 10. Pocas de cada modelo, bordadas en nuestro taller.",
    ctaLabel: "Ver la colección",
    imagePath: "",
    imageAlt: "",
  },
  featuredCollections: [],
  railSlugs: [],
  lookbook: [],
  instagram: {
    handle: "minigalumodainfantil",
    url: "https://www.instagram.com/minigalumodainfantil/",
    imagePaths: [],
  },
};
