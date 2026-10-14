import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLogin } from "@/features/taller/auth/AdminLogin";
import { getAdminSession } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Ingresar al taller", robots: { index: false } };

export default async function Page() {
  if (await getAdminSession()) redirect("/taller");
  return (
    <Suspense>
      <AdminLogin />
    </Suspense>
  );
}
