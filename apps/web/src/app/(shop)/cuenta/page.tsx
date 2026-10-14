import type { Metadata } from "next";
import { AccountView } from "@/features/account/AccountView";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

/** Mockup: design/mockups/cuenta.html */
export default function Page() {
  return <AccountView />;
}
