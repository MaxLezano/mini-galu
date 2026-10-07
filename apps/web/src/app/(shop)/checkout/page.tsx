import type { Metadata } from "next";
import { CheckoutView } from "@/features/checkout/containers/CheckoutView";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

/** Mockup: design/mockups/checkout.html */
export default async function Page({ searchParams }: PageProps<"/checkout">) {
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const pedido = one(q.pedido);
  const t = one(q.t);
  const config = await api.checkoutConfig();
  return (
    <CheckoutView config={config} back={pedido && t ? { pedido, t, paymentId: one(q.payment_id) ?? null } : null} />
  );
}
