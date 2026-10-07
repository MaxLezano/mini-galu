import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductPage } from "@/features/product/ProductPage";
import { ApiRequestError, api } from "@/lib/api";

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
  return { title: p.name, description: p.description, openGraph: { images: p.images.slice(0, 1).map((i) => i.url) } };
}

export default async function Page({ params }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const [product, facets] = await Promise.all([load(slug), api.facets()]);
  const launchAt = facets.collections.find((c) => c.slug === product.collection.slug)?.launchAt ?? null;
  return <ProductPage product={product} launchAt={launchAt} />;
}
