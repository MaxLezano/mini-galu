import type { Metadata } from "next";
import { InTheWorks } from "@/ui/organisms/InTheWorks";

export const metadata: Metadata = { title: "Seguir mi pedido" };

/** Mockup: design/mockups/seguimiento.html */
export default function Page() {
  return <InTheWorks title="Seguir mi pedido" phase="Fase 5 · Envíos y seguimiento" />;
}
