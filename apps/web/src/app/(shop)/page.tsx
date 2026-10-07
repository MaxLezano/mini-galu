import { HomePage } from "@/features/home/HomePage";
import { api } from "@/lib/api";

export default async function Page() {
  const [home, products] = await Promise.all([api.home(), api.products({ instock: "0" })]);
  // el lookbook muestra también el borrador del lanzamiento
  const draft = await Promise.all(
    home.lookbook
      .filter((l) => !products.some((p) => p.slug === l.productSlug))
      .map((l) => api.product(l.productSlug).catch(() => null)),
  );
  return <HomePage home={home} products={[...products, ...draft.filter((p) => p !== null)]} />;
}
