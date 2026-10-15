import { HELP_TOPICS } from "@mini-galu/contracts";
import type { MetadataRoute } from "next";
import { api } from "@/lib/api";
import { absoluteUrl } from "@/lib/seo";

/** Páginas públicas: inicio, catálogo, gift cards, ayuda y cada prenda publicada (con o sin stock). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await api.products({ instock: "0" });
  return [
    { url: absoluteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/catalogo"), changeFrequency: "daily", priority: 0.9 },
    { url: absoluteUrl("/giftcards"), changeFrequency: "monthly", priority: 0.6 },
    ...HELP_TOPICS.map((t) => ({
      url: absoluteUrl(`/ayuda/${t}`),
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/producto/${p.slug}`),
      lastModified: p.createdAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
      images: p.images.slice(0, 1).map((i) => absoluteUrl(i.url)),
    })),
  ];
}
