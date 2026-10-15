import type { Metadata } from "next";
import { stateFromParams, toQuery } from "@/features/catalog/catalog-state";
import { CatalogView } from "@/features/catalog/containers/CatalogView";
import { api } from "@/lib/api";
import "@/features/catalog/catalog.css";

export const metadata: Metadata = {
  title: "Catálogo",
  description: "Todas las prendas de Mini Galú, de 12 meses a talle 10: filtrá por talle, colección, color y ocasión.",
  // los filtros son la misma página: una sola URL para los buscadores
  alternates: { canonical: "/catalogo" },
};

export default async function Page({ searchParams }: PageProps<"/catalogo">) {
  const params = await searchParams;
  const state = stateFromParams(params);
  const [products, facets] = await Promise.all([api.products(toQuery(state)), api.facets()]);
  return (
    <CatalogView
      // navegar a otro filtro desde el menú (estando ya en /catalogo) reinicia el estado
      key={JSON.stringify(params)}
      initial={state}
      initialProducts={products}
      collections={facets.collections}
      colors={facets.colors}
      priceRange={facets.priceRange}
    />
  );
}
