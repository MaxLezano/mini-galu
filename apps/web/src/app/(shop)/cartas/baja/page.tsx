import type { Metadata } from "next";
import { Unsubscribe } from "@/features/newsletter/Unsubscribe";

export const metadata: Metadata = { title: "Cartas del taller", robots: { index: false } };

export default async function Page({ searchParams }: PageProps<"/cartas/baja">) {
  const { t } = await searchParams;
  return <Unsubscribe token={typeof t === "string" ? t : null} />;
}
