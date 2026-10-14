import type { Metadata } from "next";
import { AutomationsAdmin } from "@/features/taller/automations/AutomationsAdmin";
import { adminServer, getAdminSession } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Automatizaciones" };

/** Mockup: design/mockups/admin-automatizaciones.html */
export default async function Page() {
  const [data, session] = await Promise.all([adminServer.automations(), getAdminSession()]);
  return <AutomationsAdmin initial={data} email={session?.email ?? ""} />;
}
