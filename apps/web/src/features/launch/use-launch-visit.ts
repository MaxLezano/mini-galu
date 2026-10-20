"use client";

import type { LaunchVisitRequest } from "@mini-galu/contracts";
import { type RefObject, useEffect } from "react";
import { api } from "@/lib/api";

/**
 * Cuenta una visita al adelanto (admin-lanzamientos · "visitas al adelanto"): con `ref`, cuando la sección se ve;
 * sin `ref`, al abrir la página. Una vez por pestaña; la API la cuenta una por visitante y día.
 * Las capturas (`?static`) no cuentan.
 */
export function useLaunchVisit(target: LaunchVisitRequest | null, ref?: RefObject<Element | null>) {
  // el objeto se arma en cada render: el efecto depende de su contenido
  const body = target && JSON.stringify(target);
  useEffect(() => {
    if (!body || document.documentElement.classList.contains("static")) return;
    const key = `mg-visit:${body}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {}
    const send = () => {
      try {
        sessionStorage.setItem(key, "1");
      } catch {}
      api.launchVisit(JSON.parse(body)).catch(() => {});
    };
    if (!ref) return send();
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e?.isIntersecting) return;
        io.disconnect();
        send();
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [body, ref]);
}
