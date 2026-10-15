import type { Metadata } from "next";
import { GiftcardsPage } from "@/features/giftcards/GiftcardsPage";

export const metadata: Metadata = {
  title: "Gift cards",
  alternates: { canonical: "/giftcards" },
  description:
    "Regalá una gift card de Mini Galú: llega por mail o WhatsApp con tu mensaje y se usa en la web, en una o varias compras.",
};

/** Mockup: design/mockups/giftcards.html */
export default function Page() {
  return <GiftcardsPage />;
}
