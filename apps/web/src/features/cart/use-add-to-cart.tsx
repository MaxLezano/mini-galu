"use client";

import type { ProductSummary, Size } from "@mini-galu/contracts";
import { Info } from "lucide-react";
import { useCallback } from "react";
import { cover, sizesIn } from "@/lib/product";
import { bumpBadge, flyToBag } from "../shell/craft";
import { toast, useUi } from "../shell/ui-store";
import { useCart } from "./cart-store";

/** Agregar a la bolsa con todo el ritual: la prenda vuela, la bolsa salta, toast con foto y (opcional) se abre la bolsa. */
export function useAddToCart() {
  const add = useCart((s) => s.add);
  const setDrawer = useUi((s) => s.setDrawer);

  return useCallback(
    (p: ProductSummary, size?: Size, opts: { from?: HTMLImageElement | null; open?: boolean } = {}) => {
      const s = size ?? sizesIn(p)[0];
      if (!s) return toast("No queda stock de este modelo", { icon: <Info className="i-sm" /> });
      const r = add(p, s);
      if (!r.ok)
        return toast(`Tenemos ${r.max} en talle ${s} y ya están en tu bolsa`, { icon: <Info className="i-sm" /> });
      bumpBadge();
      const flew = flyToBag(opts.from);
      toast(
        <span>
          <b>{p.name}</b> · talle {s} a la bolsa
        </span>,
        { image: cover(p) },
      );
      // abre la bolsa cuando la prenda llegó
      if (opts.open) setTimeout(() => setDrawer(true), flew ? 850 : 0);
    },
    [add, setDrawer],
  );
}
