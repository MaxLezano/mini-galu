import type { Metadata } from "next";
import { GaluAdmin } from "@/features/taller/assistant/GaluAdmin";
import { adminServer } from "@/lib/admin-server";

export const metadata: Metadata = { title: "Galú" };

/** Mockup: design/mockups/admin-galu.html */
export default async function Page() {
  return <GaluAdmin initial={await adminServer.assistant()} />;
}
