import type { Metadata } from "next";
import { SubscribersAdmin } from "@/features/taller/subscribers/SubscribersAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Suscriptores" };

/** Sin mockup: quiénes reciben las cartas, se anotaron a un lanzamiento o esperan un talle (solo para ver). */
export default async function Page() {
  return <SubscribersAdmin data={await adminServer.subscribers()} />;
}
