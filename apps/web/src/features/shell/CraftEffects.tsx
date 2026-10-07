"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useCart } from "@/features/cart/cart-store";
import { useFavorites } from "@/features/favorites/favorites-store";
import { autoReveal, drawCraft, measuringTape, observeReveal, sewSeams } from "./craft";
import { useUi } from "./ui-store";

/** Monta los detalles de taller en cada página y los reengancha cuando se agrega contenido (filtros, Galú…). */
export function CraftEffects() {
  const pathname = usePathname();
  const menuOpen = useUi((s) => s.menuOpen);

  // una vez: modo captura, stores persistidos, cinta métrica y medida del panel de talles de las tarjetas en arco
  useEffect(() => {
    if (new URLSearchParams(location.search).has("static")) document.documentElement.classList.add("static");
    void useCart.persist.rehydrate();
    void useFavorites.persist.rehydrate();
    const stopTape = measuringTape();
    const measureQuick = (e: Event) => {
      const c = (e.target as Element | null)?.closest?.(".p-card.arch") as HTMLElement | null;
      const q = c?.querySelector<HTMLElement>(".p-quick");
      if (c && q) c.style.setProperty("--qh", `${q.offsetHeight}px`);
    };
    document.addEventListener("pointerover", measureQuick, { passive: true });
    document.addEventListener("focusin", measureQuick);
    return () => {
      stopTape();
      document.removeEventListener("pointerover", measureQuick);
      document.removeEventListener("focusin", measureQuick);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
  }, [menuOpen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: se rearma en cada navegación
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    const run = () => {
      autoReveal();
      cleanups.push(observeReveal(), drawCraft(), sewSeams());
    };
    const raf = requestAnimationFrame(run);
    let t: ReturnType<typeof setTimeout>;
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(run, 60);
    });
    const main = document.querySelector("main");
    if (main) mo.observe(main, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      mo.disconnect();
      for (const c of cleanups) c();
    };
  }, [pathname]);

  return null;
}
