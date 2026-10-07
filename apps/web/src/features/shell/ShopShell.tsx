"use client";

import type { ReactNode } from "react";
import { Galu } from "@/features/assistant/components/Galu";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import { CraftEffects } from "./CraftEffects";
import { Announce } from "./components/Announce";
import { ContactRail } from "./components/ContactRail";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { MobileNav } from "./components/MobileNav";
import { SearchOverlay } from "./components/SearchOverlay";
import { ToastHost } from "./components/ToastHost";
import { type ShellData, ShellDataProvider } from "./shell-context";

/** Layout compartido de la tienda (mockup app.js → header(), footer(), overlays()). */
export function ShopShell({ data, children }: { data: ShellData; children: ReactNode }) {
  return (
    <ShellDataProvider value={data}>
      <Announce items={data.announcements} />
      <Header />
      <MobileNav />
      {children}
      <Footer />
      <SearchOverlay />
      <CartDrawer />
      <ContactRail />
      <Galu />
      <ToastHost />
      <CraftEffects />
    </ShellDataProvider>
  );
}
