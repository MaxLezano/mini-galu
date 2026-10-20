import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReviewPage } from "@/features/reviews/ReviewPage";
import { ApiRequestError, api } from "@/lib/api";

export const metadata: Metadata = { title: "¿Cómo le quedó?", robots: { index: false } };

/** Reseñas de un pedido entregado: se entra con el token del pedido (mail "¿Cómo le quedó? ♡" o Mi cuenta). */
export default async function Page({ params, searchParams }: PageProps<"/resena/[number]">) {
  const { number } = await params;
  const { t } = await searchParams;
  const token = Array.isArray(t) ? t[0] : t;
  if (!token) notFound();
  const order = await api.reviewOrder(number, token).catch((e) => {
    if (e instanceof ApiRequestError && e.status === 404) return null;
    throw e;
  });
  if (!order) notFound();
  return <ReviewPage order={order} token={token} />;
}
