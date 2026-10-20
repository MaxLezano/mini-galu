import type { Metadata } from "next";
import { ReviewsAdmin } from "@/features/taller/reviews/ReviewsAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Reseñas" };

/** Sin mockup: las reseñas de los clientes, para publicar, ocultar y elegir las del inicio. */
export default async function Page() {
  return <ReviewsAdmin initial={await adminServer.reviews()} />;
}
