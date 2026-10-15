import type { ReactNode } from "react";
import { PageTransition } from "@/features/shell/PageTransition";

export default function Template({ children }: { children: ReactNode }) {
  return <PageTransition>{children}</PageTransition>;
}
