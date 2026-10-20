import { instagramUrl, type ProductDetail, type StorePolicies } from "@mini-galu/contracts";
import { totalStock } from "./product";
import { SITE } from "./site";

/** Datos estructurados (schema.org) de la tienda: Google los usa para precio, stock y migas en los resultados. */
export const absoluteUrl = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE.url}${path}`);

/** Lo que va dentro de `<script type="application/ld+json">`: sin `<` para que un texto no cierre el script. */
export const serializeJsonLd = (data: object) => JSON.stringify(data).replace(/</g, "\u003c");

/** Base de Open Graph: cada página que define `openGraph` reemplaza la del layout entera, así que la repite. */
export const OPEN_GRAPH = { siteName: SITE.name, locale: "es_AR", type: "website" } as const;

/** La tienda, con el contacto de Tienda y pagos → Datos de la tienda. */
export function storeJsonLd({ contact }: StorePolicies) {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: SITE.name,
    description: SITE.description,
    url: absoluteUrl("/"),
    email: contact.email,
    sameAs: [instagramUrl(contact.instagram)],
  };
}

/** Ficha de producto: Product (precio en pesos, stock, puntaje) + migas Inicio / Catálogo / colección. */
export function productJsonLd(p: ProductDetail) {
  const url = absoluteUrl(`/producto/${p.slug}`);
  const available = p.status === "published" && totalStock(p) > 0;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "@id": `${url}#producto`,
        name: p.name,
        description: p.description,
        sku: p.slug,
        image: p.images.map((i) => absoluteUrl(i.url)),
        brand: { "@type": "Brand", name: SITE.name },
        category: p.collection.name,
        color: p.color.name,
        material: p.fabric,
        offers: {
          "@type": "Offer",
          url,
          priceCurrency: "ARS",
          price: (p.priceCents / 100).toFixed(2),
          availability: `https://schema.org/${available ? "InStock" : "OutOfStock"}`,
          itemCondition: "https://schema.org/NewCondition",
          seller: { "@type": "Organization", name: SITE.name },
        },
        ...(p.rating.count > 0 && {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: p.rating.average.toFixed(1),
            reviewCount: p.rating.count,
          },
        }),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { name: "Inicio", item: absoluteUrl("/") },
          { name: "Catálogo", item: absoluteUrl("/catalogo") },
          { name: p.collection.name, item: absoluteUrl(`/catalogo?col=${p.collection.slug}`) },
          { name: p.name, item: url },
        ].map((crumb, i) => ({ "@type": "ListItem", position: i + 1, ...crumb })),
      },
    ],
  };
}
