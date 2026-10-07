import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsAdmin } from "@/features/taller/products/ProductsAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Productos" };

export default async function Page() {
  const [products, collections] = await Promise.all([adminServer.products(), adminServer.collections()]);
  return (
    <Suspense>
      <ProductsAdmin initial={products} collections={collections} />
    </Suspense>
  );
}
