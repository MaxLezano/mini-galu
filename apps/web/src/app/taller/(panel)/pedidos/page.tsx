import type { Metadata } from "next";
import { OrdersAdmin } from "@/features/taller/orders/containers/OrdersAdmin";
import { adminServer } from "@/lib/admin-server";
import { api } from "@/lib/api";

export const metadata: Metadata = { title: "Pedidos" };

/** Mockup: design/mockups/admin-pedidos.html */
export default async function Page({ searchParams }: PageProps<"/taller/pedidos">) {
  const { pedido } = await searchParams;
  const [orders, policies] = await Promise.all([adminServer.orders(), api.policies()]);
  return (
    <OrdersAdmin initial={orders} open={typeof pedido === "string" ? pedido : null} workshop={policies.workshop.city} />
  );
}
