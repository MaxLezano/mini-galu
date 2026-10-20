import type { Metadata } from "next";
import { HomePage } from "@/features/home/HomePage";
import { storeInfo } from "@/features/shell/store-info";
import { api } from "@/lib/api";
import { storeJsonLd } from "@/lib/seo";
import { JsonLd } from "@/ui/atoms/JsonLd";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Page() {
  const [home, products, policies] = await Promise.all([api.home(), api.products({ instock: "0" }), api.policies()]);
  // el lookbook muestra también el borrador del lanzamiento
  const draft = await Promise.all(
    home.lookbook
      .filter((l) => !products.some((p) => p.slug === l.productSlug))
      .map((l) => api.product(l.productSlug).catch(() => null)),
  );
  return (
    <>
      <JsonLd data={storeJsonLd(policies)} />
      <HomePage
        home={home}
        products={[...products, ...draft.filter((p) => p !== null)]}
        exchangeDays={policies.exchangeDays}
        instagram={{ url: storeInfo(policies).instagram, handle: storeInfo(policies).instagramHandle }}
      />
    </>
  );
}
