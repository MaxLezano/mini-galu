import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PayLinkView } from "@/features/checkout/containers/PayLinkView";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Pagar pedido", robots: { index: false } };

/** Link de pago de una venta por Instagram/WhatsApp (sin mockup propio: usa el pago y el resumen del checkout). */
export default async function Page({ params, searchParams }: PageProps<"/pagar/[number]">) {
  const { number } = await params;
  const q = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const t = one(q.t);
  if (!t) notFound();
  const [config, receipt] = await Promise.all([api.checkoutConfig(), api.receipt(number, t).catch(() => null)]);
  if (!receipt) notFound();
  return <PayLinkView config={config} initial={receipt} token={t} paymentId={one(q.payment_id) ?? null} />;
}
