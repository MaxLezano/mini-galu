import type { ReactNode } from "react";
import { ShopShell } from "@/features/shell/ShopShell";
import { api } from "@/lib/api";

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const [products, facets, home, policies] = await Promise.all([
    api.products({ instock: "0" }),
    api.facets(),
    api.home(),
    api.policies(),
  ]);
  return (
    <ShopShell
      data={{
        products,
        collections: facets.collections,
        launch: home.launch,
        announcements: home.announcements,
        policies,
      }}
    >
      {children}
    </ShopShell>
  );
}
