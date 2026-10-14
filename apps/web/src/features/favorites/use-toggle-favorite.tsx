"use client";

import { Heart } from "lucide-react";
import { useCallback } from "react";
import { accountApi } from "@/lib/account-api";
import { useAccount } from "../account/account-store";
import { stitchBurst } from "../shell/craft";
import { toast } from "../shell/ui-store";
import { useFavorites } from "./favorites-store";

export function useToggleFavorite() {
  const toggle = useFavorites((s) => s.toggle);
  return useCallback(
    (slug: string, el?: Element | null) => {
      const on = toggle(slug);
      if (on && el) stitchBurst(el);
      // con sesión, también en la cuenta (si falla, queda en el navegador y se sube al volver a ingresar)
      if (useAccount.getState().status === "in") void accountApi.setFavorite(slug, on).catch(() => {});
      toast(on ? "Guardado en favoritos" : "Quitado de favoritos", { icon: <Heart className="i-sm" /> });
    },
    [toggle],
  );
}

/** Los stores persistidos se rehidratan al montar el shell (skipHydration), así server y primer render coinciden. */
export function useIsFavorite(slug: string) {
  return useFavorites((s) => s.slugs.includes(slug));
}
