import type { Metadata } from "next";
import { LaunchesAdmin } from "@/features/taller/launches/LaunchesAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Lanzamientos" };

export default async function Page({ searchParams }: PageProps<"/taller/lanzamientos">) {
  const { nuevo } = await searchParams;
  const [launches, products, collections] = await Promise.all([
    adminServer.launches(),
    adminServer.products(),
    adminServer.collections(),
  ]);
  return (
    <LaunchesAdmin initial={launches} products={products} collections={collections} startNew={nuevo !== undefined} />
  );
}
