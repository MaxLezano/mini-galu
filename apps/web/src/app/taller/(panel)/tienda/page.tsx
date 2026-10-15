import type { Metadata } from "next";
import { StoreSettings } from "@/features/taller/store/StoreSettings";
import { adminServer, getAdminSession } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Tienda y pagos" };

export default async function Page() {
  const [home, launches, payments, shipping, coupons, newsletter, giftcards, help, session] = await Promise.all([
    adminServer.home(),
    adminServer.launches(),
    adminServer.payments(),
    adminServer.shipping(),
    adminServer.coupons(),
    adminServer.newsletter(),
    adminServer.giftcards(),
    adminServer.help(),
    getAdminSession(),
  ]);
  return (
    <StoreSettings
      home={home}
      next={launches.find((l) => l.state === "scheduled") ?? null}
      payments={payments}
      shipping={shipping}
      newsletter={newsletter}
      giftcards={giftcards}
      help={help}
      email={session?.email ?? ""}
      coupons={coupons}
    />
  );
}
