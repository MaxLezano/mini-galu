import type { Metadata } from "next";
import { RevocationView } from "@/features/revocation/containers/RevocationView";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description: "Pedí la baja de una compra dentro de los 10 días corridos desde que la recibiste. Sin cuenta.",
  alternates: { canonical: "/arrepentimiento" },
};

/** Res. SCI 424/2020 (sin mockup propio: lenguaje de seguimiento y ayuda). */
export default async function Page({ searchParams }: PageProps<"/arrepentimiento">) {
  const pedido = (await searchParams).pedido;
  return <RevocationView order={(Array.isArray(pedido) ? pedido[0] : pedido)?.trim() ?? ""} />;
}
