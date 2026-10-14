import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SecuritySettings } from "@/features/taller/security/SecuritySettings";
import { getAdminSession } from "@/lib/admin-server";
import "@/features/taller/security/security.css";

export const metadata: Metadata = { title: "Seguridad" };

export default async function Page() {
  const session = await getAdminSession();
  if (!session) redirect("/taller/ingresar");
  return <SecuritySettings enabled={session.twoFactorEnabled} email={session.email} />;
}
