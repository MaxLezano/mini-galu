import type { Metadata } from "next";
import { InTheWorks } from "@/ui/organisms/InTheWorks";

export const metadata: Metadata = { title: "Ingresar" };

/** Mockup: design/mockups/ingresar.html */
export default function Page() {
  return <InTheWorks title="Ingresar" phase="Fase 8 · Cuenta" />;
}
