import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/features/product/ProductPage";
import { ApiRequestError, api } from "@/lib/api";
import { OPEN_GRAPH, productJsonLd } from "@/lib/seo";
import { JsonLd } from "@/ui/atoms/JsonLd";

async function load(slug: string) {
  try {
    return await api.product(slug);
  } catch (e) {
    if (e instanceof ApiRequestError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const p = await load((await params).slug);
  const path = `/producto/${p.slug}`;
  return {
    title: p.name,
    description: p.description,
    alternates: { canonical: path },
    // el adelanto de un lanzamiento (borrador) se ve por link pero no entra a los buscadores
    ...(p.status === "draft" && { robots: { index: false } }),
    openGraph: {
      ...OPEN_GRAPH,
      url: path,
      title: p.name,
      description: p.description,
      images: p.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })),
    },
  };
}

export default async function Page({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const [product, facets] = await Promise.all([load(slug), api.facets()]);
  const launchAt = facets.collections.find((c) => c.slug === product.collection.slug)?.launchAt ?? null;
  return (
    <>
      <JsonLd data={productJsonLd(product)} />
      <ProductPage product={product} launchAt={launchAt} />
    </>
  );
}
