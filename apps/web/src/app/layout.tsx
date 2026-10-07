import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Manrope } from "next/font/google";
import type { ReactNode } from "react";
import { SITE } from "@/lib/site";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "@/styles/globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "WONK", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});
const caveat = Caveat({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-caveat", display: "swap" });

export const metadata: Metadata = {
  title: { default: `${SITE.name} — Prendas de diseño para niñas`, template: `%s — ${SITE.name}` },
  description: SITE.description,
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#FBF8F3",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="es-AR"
      data-scroll-behavior="smooth"
      className={`${fraunces.variable} ${manrope.variable} ${caveat.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
