"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { useAccount } from "@/features/account/account-store";
import { useCart } from "@/features/cart/cart-store";
import { useFavorites } from "@/features/favorites/favorites-store";
import {
  autoReveal,
  drawCraft,
  heroOnCardClick,
  measuringTape,
  observeReveal,
  releaseHero,
  settleAnchor,
  sewSeams,
} from "./craft";
import { dragScroll } from "./drag-scroll";
import { useUi } from "./ui-store";

/** React ya tomó este nodo (lo marca con su fiber al hidratar o al crearlo). */
const isHydrated = (el: Element) => Object.keys(el).some((k) => k.startsWith("__reactFiber$"));

/** Monta los detalles de taller en cada página y los reengancha cuando se agrega contenido (filtros, Galú…). */
export function CraftEffects() {
  const pathname = usePathname();
  const menuOpen = useUi((s) => s.menuOpen);

  // una vez: modo captura, stores persistidos, cinta métrica y medida del panel de talles de las tarjetas en arco
  useEffect(() => {
    if (new URLSearchParams(location.search).has("static")) document.documentElement.classList.add("static");
    void Promise.resolve(useCart.persist.rehydrate()).then(() => useCart.getState().refresh());
    // favoritos del navegador y, si hay sesión, los de la cuenta (se suman al ingresar)
    void Promise.resolve(useFavorites.persist.rehydrate()).then(() => useAccount.getState().load());
    const stopTape = measuringTape();
    const stopDrag = dragScroll();
    const measureQuick = (e: Event) => {
      const c = (e.target as Element | null)?.closest?.(".p-card.arch") as HTMLElement | null;
      const q = c?.querySelector<HTMLElement>(".p-quick");
      if (c && q) c.style.setProperty("--qh", `${q.offsetHeight}px`);
    };
    document.addEventListener("pointerover", measureQuick, { passive: true });
    document.addEventListener("focusin", measureQuick);
    document.addEventListener("click", heroOnCardClick);
    return () => {
      stopTape();
      stopDrag();
      document.removeEventListener("pointerover", measureQuick);
      document.removeEventListener("focusin", measureQuick);
      document.removeEventListener("click", heroOnCardClick);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("menu-open", menuOpen);
  }, [menuOpen]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: se rearma en cada navegación
  useEffect(() => {
    releaseHero();
    const cleanups: (() => void)[] = [settleAnchor()];
    let t: ReturnType<typeof setTimeout>;
    const run = () => {
      // la página llega por streaming dentro del Suspense de loading.tsx e hidrata después que el shell: hasta
      // entonces no se la toca (cambiarle atributos rompe la hidratación)
      const main = document.querySelector("main");
      if (main && !isHydrated(main)) {
        clearTimeout(t);
        t = setTimeout(run, 60);
        return;
      }
      autoReveal();
      cleanups.push(observeReveal(), drawCraft(), sewSeams());
    };
    const raf = requestAnimationFrame(run);
    const mo = new MutationObserver(() => {
      clearTimeout(t);
      t = setTimeout(run, 60);
    });
    // el contenedor del <main>, no el <main>: el del skeleton (loading.tsx) se reemplaza por el de la página
    const host = document.querySelector("main")?.parentElement;
    if (host) mo.observe(host, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
      mo.disconnect();
      for (const c of cleanups) c();
    };
  }, [pathname]);

  return null;
}
