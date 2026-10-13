import type { Metadata } from "next";
import { OrdersAdmin } from "@/features/taller/orders/containers/OrdersAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Pedidos" };

/** Mockup: design/mockups/admin-pedidos.html */
export default async function Page({ searchParams }: PageProps<"/taller/pedidos">) {
  const { pedido } = await searchParams;
  const orders = await adminServer.orders();
  return <OrdersAdmin initial={orders} open={typeof pedido === "string" ? pedido : null} />;
}
