import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/** El panel, la cuenta y los pasos de compra no se indexan (además llevan `noindex`). */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/taller", "/checkout", "/cuenta", "/ingresar", "/pagar/", "/lista/", "/seguimiento", "/cartas/"],
    },
    sitemap: `${SITE.url}/sitemap.xml`,
  };
}
