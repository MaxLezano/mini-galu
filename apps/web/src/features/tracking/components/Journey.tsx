"use client";

import type { ShippingMethod, TrackingStop } from "@mini-galu/contracts";
import { Store, Truck } from "lucide-react";
import { type CSSProperties, useEffect, useRef } from "react";
import { isStill } from "@/features/shell/craft";

/** Recorrido con la línea punteada, el avance y el camión sobre el último punto hecho (seguimiento.html → place()). */
export function Journey({ stops, method }: { stops: TrackingStop[]; method: ShippingMethod }) {
  const root = useRef<HTMLDivElement>(null);
  const done = stops.filter((s) => s.done).length;
  const moving = done > 0 && done < stops.length;

  useEffect(() => {
    const j = root.current;
    if (!j) return;
    const track = j.querySelector<HTMLElement>(".track");
    const fill = j.querySelector<HTMLElement>(".fill");
    const truck = j.querySelector<HTMLElement>(".truck");
    const place = (animate: boolean) => {
      if (!track || !fill || getComputedStyle(track).display === "none") return;
      const dots = [...j.querySelectorAll<HTMLElement>(".dot")];
      const jr = j.getBoundingClientRect();
      const cx = (el: HTMLElement) => el.getBoundingClientRect().left + el.offsetWidth / 2 - jr.left;
      const first = dots[0] ? cx(dots[0]) : 0;
      const last = dots.at(-1) ? cx(dots.at(-1) as HTMLElement) : first;
      const doneDots = j.querySelectorAll<HTMLElement>(".stop.is-done .dot");
      const cur = doneDots.length ? cx(doneDots[doneDots.length - 1] as HTMLElement) : first;
      Object.assign(track.style, { left: `${first}px`, width: `${last - first}px` });
      fill.style.left = `${first}px`;
      if (!animate) {
        fill.style.transition = "none";
        if (truck) truck.style.transition = "none";
      }
      fill.style.width = `${Math.max(0, cur - first)}px`;
      if (truck) {
        truck.style.left = `${first}px`;
        requestAnimationFrame(() => {
          truck.style.left = `${cur}px`;
        });
      }
    };
    const t = setTimeout(() => place(!isStill()), 350);
    const onResize = () => place(false);
    addEventListener("resize", onResize);
    return () => {
      clearTimeout(t);
      removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <div className="journey" ref={root} style={{ "--n": stops.length } as CSSProperties}>
      <i className="track" />
      <i className="fill" />
      {moving && <span className="truck">{method === "taller" ? <Store /> : <Truck />}</span>}
      {stops.map((s) => (
        <div className={`stop ${s.done ? "is-done" : ""}`} key={s.title}>
          <i className="dot" />
          <b>{s.title}</b>
          <span>{s.detail}</span>
        </div>
      ))}
    </div>
  );
}
