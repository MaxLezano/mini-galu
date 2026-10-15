import { serializeJsonLd } from "@/lib/seo";

/** Datos estructurados para buscadores (ver lib/seo.ts). */
export function JsonLd({ data }: { data: object }) {
  // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON serializado sin "<" (serializeJsonLd)
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }} />;
}
