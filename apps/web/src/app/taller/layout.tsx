import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@/styles/taller.css";

export const metadata: Metadata = {
  title: { default: "Taller", template: "%s — Taller Mini Galú" },
  robots: { index: false },
};

export default function TallerLayout({ children }: { children: ReactNode }) {
  return children;
}
