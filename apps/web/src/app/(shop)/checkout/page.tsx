import type { Metadata } from "next";
import { InTheWorks } from "@/ui/organisms/InTheWorks";

export const metadata: Metadata = { title: "Checkout" };

/** Mockup: design/mockups/checkout.html */
export default function Page() {
  return <InTheWorks title="Checkout" phase="Fase 3 · Checkout con Mercado Pago" />;
}
