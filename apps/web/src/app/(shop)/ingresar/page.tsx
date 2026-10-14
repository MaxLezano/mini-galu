import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthView } from "@/features/account/AuthView";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Ingresar", robots: { index: false } };

/** Mockup: design/mockups/ingresar.html */
export default async function Page() {
  // la foto del costado: la primera prenda del catálogo (las fotos de contenido no van al repo)
  const first = await api
    .products()
    .then((list) => list.find((p) => p.images[0]))
    .catch(() => undefined);
  const photo = first?.images[0] ? { url: first.images[0].url, alt: first.images[0].alt || first.name } : null;
  return (
    <Suspense>
      <AuthView photo={photo} />
    </Suspense>
  );
}
