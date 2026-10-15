import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { OPEN_GRAPH } from "@/lib/seo";
import { SITE } from "@/lib/site";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/thumbs";
import "@/styles/globals.css";

// fuentes servidas desde el proyecto (app/fonts): no dependen de Google al compilar ni en el CI
const fraunces = localFont({
  src: [
    { path: "./fonts/fraunces-latin-full-normal.woff2", style: "normal" },
    { path: "./fonts/fraunces-latin-full-italic.woff2", style: "italic" },
  ],
  weight: "100 900",
  variable: "--font-fraunces",
  display: "swap",
});
const manrope = localFont({
  src: "./fonts/manrope-latin-wght-normal.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});
const caveat = localFont({
  src: "./fonts/caveat-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-caveat",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: `${SITE.name} — Prendas de diseño para niñas`, template: `%s — ${SITE.name}` },
  description: SITE.description,
  metadataBase: new URL(SITE.url),
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
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
