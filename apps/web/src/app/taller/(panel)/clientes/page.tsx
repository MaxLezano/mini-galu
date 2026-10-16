import type { Metadata } from "next";
import { Suspense } from "react";
import { CustomersAdmin } from "@/features/taller/customers/CustomersAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Clientes" };

/** Mockup: design/mockups/admin-clientes.html */
export default async function Page() {
  const customers = await adminServer.customers();
  return (
    <Suspense>
      <CustomersAdmin initial={customers} />
    </Suspense>
  );
}
