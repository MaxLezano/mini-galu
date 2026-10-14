import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WishlistPublic } from "@/features/wishlist/WishlistPublic";
import { ApiRequestError, api } from "@/lib/api";

export const metadata: Metadata = { title: "Lista de cumple", robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [list, products] = await Promise.all([
    api.wishlist(slug).catch((e) => {
      if (e instanceof ApiRequestError && e.status === 404) return null;
      throw e;
    }),
    api.products({ instock: "0" }).catch(() => []),
  ]);
  if (!list) notFound();
  return <WishlistPublic slug={slug} list={list} products={products} />;
}
