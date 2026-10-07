import type { Metadata } from "next";
import { StoreSettings } from "@/features/taller/store/StoreSettings";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Tienda y pagos" };

export default async function Page() {
  const [home, launches] = await Promise.all([adminServer.home(), adminServer.launches()]);
  return <StoreSettings home={home} next={launches.find((l) => l.state === "scheduled") ?? null} />;
}
