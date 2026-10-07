import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/features/taller/shell/AdminShell";
import { getAdminSession } from "@/lib/admin-server";

/** Todo lo que está acá adentro necesita la sesión del taller. */
export default async function PanelLayout({ children }: { children: ReactNode }) {
  const session = await getAdminSession();
  if (!session) redirect("/taller/ingresar");
  return <AdminShell session={session}>{children}</AdminShell>;
}
