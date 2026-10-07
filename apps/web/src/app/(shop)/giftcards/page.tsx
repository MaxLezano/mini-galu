import type { Metadata } from "next";
import { InTheWorks } from "@/ui/organisms/InTheWorks";

export const metadata: Metadata = { title: "Gift cards" };

/** Mockup: design/mockups/giftcards.html */
export default function Page() {
  return <InTheWorks title="Gift cards" phase="Fase 8 · Gift cards" />;
}
